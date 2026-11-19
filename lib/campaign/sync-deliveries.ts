import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getJobReport, type JobReport, type RecipientRow } from "@/lib/worker/email";
import type { CampaignDelivery } from "@/lib/supabase/types";
import { campaignClickTotal } from "@/lib/campaign/click-total";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { mapWithConcurrency } from "@/lib/util/concurrency";

type CampaignDeliveryRow = Pick<
  CampaignDelivery,
  "id" | "worker_job_id" | "email" | "status" | "recipient_status" | "opened_at" | "delivered_at"
>;

async function loadCampaignDeliveryRows(
  campaignId: string,
  signal?: AbortSignal,
): Promise<CampaignDeliveryRow[]> {
  const supabase = getAdminClient();
  return fetchAllRows<CampaignDeliveryRow>(async (from, to) => {
    const query = supabase
      .from("campaign_deliveries")
      .select("id, worker_job_id, email, status, recipient_status, opened_at, delivered_at")
      .eq("campaign_id", campaignId)
      .not("worker_job_id", "is", null)
      .order("id")
      .range(from, to);
    if (signal) query.abortSignal(signal);
    const page = await query;
    if (page.error) throw new Error(page.error.message);
    return page;
  });
}

function sameInstant(first: string | null, second: string | null): boolean {
  return (
    first === second ||
    (first !== null && second !== null && Date.parse(first) === Date.parse(second))
  );
}

export async function syncCampaignDeliveries(
  campaignId: string,
  {
    reports: knownReports,
    syncedAt = new Date().toISOString(),
    signal,
    refreshClicks = true,
  }: {
    reports?: ReadonlyMap<string, JobReport>;
    syncedAt?: string;
    signal?: AbortSignal;
    refreshClicks?: boolean;
  } = {},
): Promise<number> {
  const supabase = getAdminClient();
  const rows = await loadCampaignDeliveryRows(campaignId, signal);
  const jobIds = [...new Set(rows.map((row) => row.worker_job_id).filter((id) => id !== null))];
  const reports = new Map<string, JobReport>(knownReports);
  for (const jobId of jobIds) {
    signal?.throwIfAborted();
    if (reports.has(jobId)) continue;
    try {
      const report = await getJobReport(jobId, signal);
      if (report) reports.set(jobId, report);
    } catch {
      /* continue */
    }
  }

  const recipientsByJob = new Map<string, Map<string, RecipientRow>>();
  for (const [jobId, report] of reports) {
    const recipientsByEmail = new Map<string, RecipientRow>();
    for (const recipient of report.recipients) {
      const email = recipient.email.trim().toLowerCase();
      if (!recipientsByEmail.has(email)) recipientsByEmail.set(email, recipient);
    }
    recipientsByJob.set(jobId, recipientsByEmail);
  }

  const writes = await mapWithConcurrency(rows, 8, async (row) => {
    if (signal?.aborted || !row.worker_job_id) return null;
    const jobId = row.worker_job_id;
    const report = reports.get(jobId);
    if (!report) return null;
    const recipient =
      recipientsByJob.get(jobId)?.get(row.email.trim().toLowerCase()) ??
      (report.recipients.length === 1 ? report.recipients[0] : null);
    if (!recipient) return null;

    let status: CampaignDelivery["status"] = row.status;
    if (recipient.status === "failed" || recipient.error) status = "failed";
    else if (recipient.status === "canceled") status = "canceled";
    else if (report.status === "failed" && report.recipients.length <= 1) status = "failed";
    else if (
      report.status === "sent" ||
      report.status === "partial" ||
      recipient.status === "sent" ||
      recipient.status === "opened" ||
      recipient.status === "delivered"
    ) {
      status = "sent";
    }

    if (
      status === row.status &&
      recipient.status === row.recipient_status &&
      sameInstant(recipient.openedAt, row.opened_at) &&
      sameInstant(recipient.deliveredAt, row.delivered_at)
    ) {
      return null;
    }

    const query = supabase
      .from("campaign_deliveries")
      .update({
        status,
        recipient_status: recipient.status,
        opened_at: recipient.openedAt,
        delivered_at: recipient.deliveredAt,
        last_synced_at: syncedAt,
      })
      .eq("id", row.id)
      .eq("worker_job_id", jobId)
      .or(`last_synced_at.is.null,last_synced_at.lte.${syncedAt}`);
    if (signal) query.abortSignal(signal);
    return await query;
  });

  signal?.throwIfAborted();
  const failure = writes.find((result) => result?.error)?.error;
  if (failure) throw new Error(failure.message);
  if (refreshClicks) {
    const clickedCount = await campaignClickTotal(campaignId);
    await supabase
      .from("email_campaigns")
      .update({ clicked_count: clickedCount })
      .eq("id", campaignId);
  }

  return writes.filter(Boolean).length;
}

export async function getCampaignClickCountsByEmail(
  campaignId: string,
): Promise<Map<string, number>> {
  const supabase = getAdminClient();
  // Paged — one response stops at 1000 deliveries, which left later recipients
  // showing zero clicks in the per-person report.
  const rows = await fetchAllRows<{ email: string; click_count: number | null }>(
    (from, to) =>
      supabase
        .from("campaign_deliveries")
        .select("email, click_count")
        .eq("campaign_id", campaignId)
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: 1000, maxPages: 200 },
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.email.toLowerCase(), row.click_count ?? 0);
  }
  return map;
}
