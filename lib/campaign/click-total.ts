import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/admin/stats-shared";

/**
 * Total clicks across a campaign's deliveries.
 *
 * Summed in SQL: a plain `select("click_count")` stops at PostgREST's 1000-row
 * cap, so bigger campaigns reported a truncated total. Falls back to a paged sum
 * when the function is not deployed yet — still correct, just chattier.
 */
export async function campaignClickTotal(campaignId: string): Promise<number> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc("campaign_click_total", {
    p_campaign_id: campaignId,
  });

  if (!error && data !== null && data !== undefined) {
    const total = Number(data);
    if (Number.isFinite(total)) return total;
  }

  if (error) {
    console.warn(
      "[campaign] campaign_click_total unavailable, paging instead:",
      error.message,
    );
  }

  const rows = await fetchAllRows<{ click_count: number | null }>(
    (from, to) =>
      supabase
        .from("campaign_deliveries")
        .select("click_count")
        .eq("campaign_id", campaignId)
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: 1000, maxPages: 200 },
  );

  return rows.reduce((sum, row) => sum + (row.click_count ?? 0), 0);
}
