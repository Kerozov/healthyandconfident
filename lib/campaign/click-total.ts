import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

/**
 * How many people clicked in a campaign: a tracked click on the main button
 * (`click_count`, our own redirect) or a click ZeptoMail reported to the worker
 * (`recipient_status = 'clicked'`). Buttons and links inside the text only reach
 * us the second way, so counting `click_count` alone showed 0 clicks on
 * campaigns where dozens of people clicked.
 *
 * One count query — no rows come back, so the 1000-row cap does not apply.
 */
export async function campaignClickerCount(campaignId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("campaign_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .or("click_count.gt.0,recipient_status.eq.clicked");
  if (error) throw new Error(error.message);
  return count ?? 0;
}
