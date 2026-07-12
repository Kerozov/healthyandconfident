import type { Automation } from "@/lib/supabase/types";
import {
  scheduledAtAfterDays,
  scheduledAtAfterMinutes,
  scheduledAtOnDate,
} from "@/lib/datetime";

function sendAtAfterDays(
  days: number,
  sendTime: string,
  from?: Date,
): string {
  return scheduledAtAfterDays(days, sendTime || "09:00", from);
}

/** When an automation email should be sent (shared by batch + legacy paths). */
export function computeAutomationSendAt(
  automation: Automation,
  from?: Date,
): string {
  const sendTime = automation.send_time ?? "09:00";
  const now = from ? new Date(from) : new Date();

  if (automation.send_date) {
    const fixed = scheduledAtOnDate(automation.send_date, sendTime);
    if (new Date(fixed).getTime() > now.getTime()) {
      return fixed;
    }
    return now.toISOString();
  }

  const delayDays = automation.delay_days ?? 0;
  if (delayDays > 0) {
    return sendAtAfterDays(delayDays, sendTime, now);
  }

  const delayMinutes = automation.delay_minutes ?? 0;
  if (delayMinutes > 0) {
    return scheduledAtAfterMinutes(delayMinutes, now);
  }

  return now.toISOString();
}
