import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Automation,
  AutomationDelivery,
  AutomationStats,
} from "@/lib/supabase/types";
import { aggregateAutomationStats } from "@/lib/automation/sync";

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

  const { data: deliveries } = await supabase
    .from("automation_deliveries")
    .select("*")
    .in(
      "automation_id",
      automations.map((a) => a.id),
    );

  const byAutomation = new Map<string, AutomationDelivery[]>();
  for (const d of (deliveries as AutomationDelivery[]) ?? []) {
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
  const { data } = await supabase
    .from("automation_deliveries")
    .select("*")
    .eq("automation_id", automationId)
    .order("sent_at", { ascending: false });

  return (data as AutomationDelivery[]) ?? [];
}
