import type { Automation } from "@/lib/supabase/types";
import { automationEmailContent, automationSmsBody } from "@/lib/automation/content";

export type AutomationHealthIssue = {
  automationId: string;
  name: string;
  /** error = will not go out; warning = goes out, but not the way it reads. */
  level: "error" | "warning";
  message: string;
};

/**
 * Settings that stop an enabled automation from going out — checked up front
 * so the admin sees them before a subscriber silently misses an email.
 */
export function checkAutomationHealth(
  automations: Automation[],
  opts: { formIds: Set<string> },
): AutomationHealthIssue[] {
  const byId = new Map(automations.map((a) => [a.id, a]));
  const issues: AutomationHealthIssue[] = [];
  const add = (a: Automation, level: AutomationHealthIssue["level"], message: string) =>
    issues.push({ automationId: a.id, name: a.name, level, message });

  for (const a of automations) {
    if (!a.enabled) continue;

    if (a.channel === "email") {
      if (!automationEmailContent(a, "bg") && !automationEmailContent(a, "en")) {
        add(a, "error", "Няма текст на имейла — не се изпраща и следващите стъпки спират.");
      } else if (!a.subject_bg?.trim() && !a.subject_en?.trim()) {
        add(a, "warning", `Няма тема — изпраща се с името „${a.name}“ като тема.`);
      }
    } else if (!automationSmsBody(a, "bg")) {
      add(a, "error", "Няма текст на SMS — не се изпраща и следващите стъпки спират.");
    }

    if (a.after_automation_id) {
      // Walk up: the first switched-off or looping step above blocks this one.
      const seen = new Set<string>([a.id]);
      let parent = byId.get(a.after_automation_id);
      while (parent) {
        if (seen.has(parent.id)) {
          add(a, "error", "Веригата се затваря в кръг — тази стъпка никога няма да тръгне.");
          break;
        }
        if (!parent.enabled) {
          add(
            a,
            "error",
            `Предходната стъпка „${parent.name}“ е изключена — тази няма да тръгне, докато не я включиш.`,
          );
          break;
        }
        seen.add(parent.id);
        parent = parent.after_automation_id ? byId.get(parent.after_automation_id) : undefined;
      }
      continue;
    }

    // Chain starts: triggers that can never fire.
    if (
      a.trigger_event === "purchase" &&
      (a.purchase_product_ids?.filter(Boolean).length ?? 0) === 0
    ) {
      add(a, "error", "„След покупка“ без избран продукт — никога не се задейства.");
    }
    if (
      a.trigger_event === "segment_entry" &&
      (a.segment_keys?.filter(Boolean).length ?? 0) === 0 &&
      (a.group_ids?.filter(Boolean).length ?? 0) === 0
    ) {
      add(a, "error", "„Влизане в група“ без избрана група — никога не се задейства.");
    }
    if (a.trigger_event === "form_submit") {
      if (!a.trigger_form_id) {
        add(a, "error", "„След форма“ без избрана форма — никога не се задейства.");
      } else if (!opts.formIds.has(a.trigger_form_id)) {
        add(a, "error", "Формата на тригера вече я няма — никога не се задейства.");
      }
    }
  }

  return issues;
}
