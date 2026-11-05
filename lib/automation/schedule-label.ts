import type { Automation } from "@/lib/supabase/types";

export type AutomationScheduleFields = Pick<
  Automation,
  "send_date" | "send_time" | "delay_days" | "delay_minutes" | "after_automation_id"
>;

/** Short "when does it go out" label for an automation step. */
export function automationScheduleLabel(automation: AutomationScheduleFields): string {
  if (automation.send_date) {
    return `Дата: ${automation.send_date} · ${automation.send_time}`;
  }
  if ((automation.delay_days ?? 0) > 0) {
    return `След ${automation.delay_days} дн. · ${automation.send_time}`;
  }
  if ((automation.delay_minutes ?? 0) > 0) {
    return `След ${automation.delay_minutes} мин.`;
  }
  if (automation.after_automation_id) {
    return "Веднага след предишната";
  }
  return "Веднага";
}
