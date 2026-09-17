import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Automation,
  AutomationDelivery,
  AutomationStats,
} from "@/lib/supabase/types";
import { aggregateAutomationStats } from "@/lib/automation/sync";
import { fetchAllRows } from "@/lib/admin/stats-shared";

export type AutomationRow = Automation & AutomationStats;

/**
 * Rules only — no delivery rows. The automations screen opens on the flow tab,
 * which shows no counters, so aggregating deliveries here made every visit pay
 * for numbers nobody was looking at. Counters come from `getAutomationStats`
 * once the list tab is actually opened.
 */
export async function getAutomations(): Promise<Automation[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automations")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (data as Automation[]) ?? [];
}

/** Only the columns `aggregateAutomationStats` reads. */
type StatsDeliveryRow = Pick<
  AutomationDelivery,
  | "automation_id"
  | "status"
  | "recipient_status"
  | "opened_at"
  | "delivered_at"
  | "click_count"
  | "last_synced_at"
>;

const STATS_COLUMNS =
  "automation_id, status, recipient_status, opened_at, delivered_at, click_count, last_synced_at";

/** Per-rule counters, keyed by automation id. Reads the local table only. */
export async function getAutomationStats(): Promise<Record<string, AutomationStats>> {
  const supabase = getAdminClient();
  const { data: rules } = await supabase.from("automations").select("id");
  const ids = ((rules as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length === 0) return {};

  // Paged: one response stops at 1000 deliveries, which made every per-rule
  // counter on the automations screen too low once the list grew.
  const deliveries = await fetchAllRows<StatsDeliveryRow>(
    (from, to) =>
      supabase
        .from("automation_deliveries")
        .select(STATS_COLUMNS)
        .in("automation_id", ids)
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: 1000, maxPages: 200 },
  );

  const byAutomation = new Map<string, StatsDeliveryRow[]>();
  for (const d of deliveries) {
    const list = byAutomation.get(d.automation_id) ?? [];
    list.push(d);
    byAutomation.set(d.automation_id, list);
  }

  const stats: Record<string, AutomationStats> = {};
  for (const id of ids) {
    stats[id] = aggregateAutomationStats(byAutomation.get(id) ?? []);
  }
  return stats;
}

export async function getAutomationDeliveries(
  automationId: string,
): Promise<AutomationDelivery[]> {
  const supabase = getAdminClient();
  // `sent_at` is not unique — deliveries created in one batch share it — so `id`
  // breaks the tie and keeps the page boundaries stable.
  return fetchAllRows<AutomationDelivery>(
    (from, to) =>
      supabase
        .from("automation_deliveries")
        .select("*")
        .eq("automation_id", automationId)
        .order("sent_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    { pageSize: 1000, maxPages: 50 },
  );
}
