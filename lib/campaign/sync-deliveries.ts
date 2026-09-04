import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getJobReport } from "@/lib/worker/email";
import type { CampaignDelivery } from "@/lib/supabase/types";
import { campaignClickTotal } from "@/lib/campaign/click-total";
import { fetchAllRows } from "@/lib/admin/stats-shared";

type CampaignDeliveryRow = {
  id: string;
  worker_job_id: string | null;
  email: string;
  status: CampaignDelivery["status"];
};

async function loadCampaignDeliveryRows(
  campaignId: string,
): Promise<CampaignDeliveryRow[]> {
  const supabase = getAdminClient();
  const all: CampaignDeliveryRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data } = await supabase
      .from("campaign_deliveries")
      .select("id, worker_job_id, email, status")
      .eq("campaign_id", campaignId)
      .not("worker_job_id", "is", null)
      .range(from, from + page - 1);
    const rows = (data as CampaignDeliveryRow[] | null) ?? [];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}

export async function syncCampaignDeliveries(campaignId: string): Promise<number> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const rows = await loadCampaignDeliveryRows(campaignId);
  let synced = 0;

  const reports = new Map<string, NonNullable<Awaited<ReturnType<typeof getJobReport>>>>();
  for (const jobId of [...new Set(rows.map((row) => row.worker_job_id).filter(Boolean))]) {
    try {
      const report = await getJobReport(jobId as string);
      if (report) reports.set(jobId as string, report);
    } catch {
      /* continue */
    }
  }

  for (const row of rows) {
    if (!row.worker_job_id) continue;
    const report = reports.get(row.worker_job_id);
    if (!report) continue;
    const email = row.email.trim().toLowerCase();
    const recipient =
      report.recipients.find((item) => item.email.trim().toLowerCase() === email) ??
      (report.recipients.length === 1 ? report.recipients[0] : null);
    if (!recipient) continue;

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

    await supabase
      .from("campaign_deliveries")
      .update({
        status,
        recipient_status: recipient.status,
        opened_at: recipient.openedAt,
        delivered_at: recipient.deliveredAt,
        last_synced_at: now,
      })
      .eq("id", row.id);
    synced += 1;
  }

  const clickedCount = await campaignClickTotal(campaignId);

  await supabase
    .from("email_campaigns")
    .update({ clicked_count: clickedCount })
    .eq("id", campaignId);

  return synced;
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
