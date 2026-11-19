import "server-only";

import { fetchAllRows } from "@/lib/admin/stats-shared";
import { syncDeliveries, type DeliverySyncResult } from "@/lib/automation/sync";
import { persistCampaignSync, persistSmsCampaignSync } from "@/lib/campaign/worker-sync";
import { getAdminClient } from "@/lib/supabase/admin";
import type { EmailCampaign, SmsCampaign } from "@/lib/supabase/types";
import { mapWithConcurrency } from "@/lib/util/concurrency";

type EmailCampaignRow = Pick<
  EmailCampaign,
  "id" | "worker_job_id" | "status" | "scheduled_at" | "recipients_count"
>;
type SmsCampaignRow = Pick<
  SmsCampaign,
  "id" | "provider_ref" | "status" | "scheduled_at" | "recipients_count"
>;

function dueScheduled(now: string) {
  return `and(status.eq.scheduled,or(scheduled_at.is.null,scheduled_at.lte.${now}))`;
}

async function syncCampaignRows<T extends { id: string }>(
  rows: T[],
  signal: AbortSignal,
  sync: (row: T) => Promise<{ ok: boolean; message?: string }>,
): Promise<DeliverySyncResult> {
  const results = await mapWithConcurrency(rows, 3, async (row) => {
    if (signal.aborted) return "remaining";
    try {
      const result = await sync(row);
      if (result.ok) return "synced";
      // Cut off by the time budget — tomorrow's run picks it up first.
      if (signal.aborted) return "remaining";
      console.error("[cron/worker-stats] Campaign", row.id, result.message);
    } catch (error) {
      if (signal.aborted) return "remaining";
      console.error("[cron/worker-stats] Campaign", row.id, error);
    }
    return "failed";
  });
  return {
    total: rows.length,
    synced: results.filter((result) => result === "synced").length,
    remaining: results.filter((result) => result === "remaining").length,
  };
}

async function syncEmailCampaigns(now: string, signal: AbortSignal) {
  const supabase = getAdminClient();
  const rows = await fetchAllRows<EmailCampaignRow>(async (from, to) => {
    const page = await supabase
      .from("email_campaigns")
      .select("id, worker_job_id, status, scheduled_at, recipients_count")
      .not("worker_job_id", "is", null)
      .or(`status.in.(queued,sending,sent,partial),${dueScheduled(now)}`)
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .order("id")
      .range(from, to)
      .abortSignal(signal);
    if (page.error) throw new Error(page.error.message);
    return page;
  });

  return syncCampaignRows(rows, signal, (row) =>
    persistCampaignSync(row.id, row.worker_job_id ?? "", row.scheduled_at, row.recipients_count, {
      signal,
      expectedStatus: row.status,
      refreshClicks: false,
    }),
  );
}

async function syncSmsCampaigns(now: string, signal: AbortSignal) {
  const supabase = getAdminClient();
  // SMS campaign totals change until sending finishes.
  const rows = await fetchAllRows<SmsCampaignRow>(async (from, to) => {
    const page = await supabase
      .from("sms_campaigns")
      .select("id, provider_ref, status, scheduled_at, recipients_count")
      .not("provider_ref", "is", null)
      .or(`status.in.(queued,sending),${dueScheduled(now)}`)
      .order("id")
      .range(from, to)
      .abortSignal(signal);
    if (page.error) throw new Error(page.error.message);
    return page;
  });

  return syncCampaignRows(rows, signal, (row) =>
    persistSmsCampaignSync(row.id, row.provider_ref ?? "", row.scheduled_at, row.recipients_count, {
      signal,
      expectedStatus: row.status,
    }),
  );
}

async function reportSync(name: string, sync: Promise<DeliverySyncResult>) {
  try {
    const counts = await sync;
    const failed = counts.total - counts.synced - counts.remaining;
    if (failed || counts.remaining) {
      console.warn(`[cron/worker-stats] ${name}`, { ...counts, failed });
    }
    return { ...counts, failed };
  } catch (error) {
    console.error(`[cron/worker-stats] ${name}`, error);
    return { error: "Sync failed" };
  }
}

/** Refresh saved reports even when nobody opens the admin panel. */
export async function syncNightlyWorkerStats() {
  const now = new Date().toISOString();
  const signal = AbortSignal.timeout(240_000);
  const [automations, emailCampaigns, smsCampaigns] = await Promise.all([
    reportSync("automations", syncDeliveries(null, { signal, timeBudgetMs: 225_000 })),
    reportSync("email campaigns", syncEmailCampaigns(now, signal)),
    reportSync("SMS campaigns", syncSmsCampaigns(now, signal)),
  ]);
  const ok = [automations, emailCampaigns, smsCampaigns].every(
    (result) => !("error" in result) && result.failed === 0,
  );
  return { ok, automations, emailCampaigns, smsCampaigns };
}
