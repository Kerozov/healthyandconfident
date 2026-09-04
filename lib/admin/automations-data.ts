import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Automation,
  AutomationDelivery,
  AutomationStats,
} from "@/lib/supabase/types";
import { aggregateAutomationStats } from "@/lib/automation/sync";
import { fetchAllRows } from "@/lib/admin/stats-shared";

export type AutomationRow = Automation & AutomationStats;

export async function getAutomations(): Promise<AutomationRow[]> {
  const supabase = getAdminClient();
  const { data: rules } = await supabase
    .from("automations")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const automations = (rules as Automation[]) ?? [];
  if (automations.length === 0) return [];

  // Paged: one response stops at 1000 deliveries, which made every per-rule
  // counter on the automations screen too low once the list grew.
  const deliveries = await fetchAllRows<AutomationDelivery>(
    (from, to) =>
      supabase
        .from("automation_deliveries")
        .select("*")
        .in(
          "automation_id",
          automations.map((a) => a.id),
        )
        .order("id", { ascending: true })
        .range(from, to),
    { pageSize: 1000, maxPages: 200 },
  );

  const byAutomation = new Map<string, AutomationDelivery[]>();
  for (const d of deliveries) {
    const list = byAutomation.get(d.automation_id) ?? [];
    list.push(d);
    byAutomation.set(d.automation_id, list);
  }

  return automations.map((a) => ({
    ...a,
    ...aggregateAutomationStats(byAutomation.get(a.id) ?? []),
  }));
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
