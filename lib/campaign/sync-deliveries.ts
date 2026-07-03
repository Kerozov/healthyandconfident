import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getJobReport } from "@/lib/worker/email";
import type { CampaignDelivery } from "@/lib/supabase/types";

type CampaignDeliveryRow = {
  id: string;
  worker_job_id: string | null;
  email: string;
  status: CampaignDelivery["status"];
};

export async function syncCampaignDeliveries(campaignId: string): Promise<number> {
  const supabase = getAdminClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from("campaign_deliveries")
    .select("id, worker_job_id, email, status")
    .eq("campaign_id", campaignId)
    .not("worker_job_id", "is", null);

  const rows = (data as CampaignDeliveryRow[]) ?? [];
  let synced = 0;

  for (const row of rows) {
    if (!row.worker_job_id) continue;
    try {
      const report = await getJobReport(row.worker_job_id);
      if (!report) continue;
      const recipient = report.recipients[0];
      if (!recipient) continue;

      let status: CampaignDelivery["status"] = row.status;
      if (report.status === "sent" || report.status === "partial") status = "sent";
      else if (report.status === "failed") status = "failed";
      else if (report.status === "canceled") status = "canceled";

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
    } catch {
      /* continue */
    }
  }

  const { data: clickRows } = await supabase
    .from("campaign_deliveries")
    .select("click_count")
    .eq("campaign_id", campaignId);

  const clickedCount = ((clickRows as { click_count: number }[] | null) ?? []).reduce(
    (sum, r) => sum + (r.click_count ?? 0),
    0,
  );

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
  const { data } = await supabase
    .from("campaign_deliveries")
    .select("email, click_count")
    .eq("campaign_id", campaignId);

  const map = new Map<string, number>();
  for (const row of (data as { email: string; click_count: number }[] | null) ?? []) {
    map.set(row.email.toLowerCase(), row.click_count ?? 0);
  }
  return map;
}
