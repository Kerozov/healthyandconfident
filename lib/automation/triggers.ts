import type { AutomationTrigger } from "@/lib/supabase/types";
import { isSiteSignupSource } from "@/lib/automation/subscriber-origins";

export const AUTOMATION_TRIGGERS: AutomationTrigger[] = [
  "new_subscriber",
  "purchase",
  "form_submit",
  "segment_entry",
];

export const AUTOMATION_TRIGGER_META: Record<
  AutomationTrigger,
  { label: string; hint: string }
> = {
  new_subscriber: {
    label: "Нов абонат",
    hint: "Първи път в списъка — сайт, ръчно или импорт. Разделяй с тагове/сегменти (напр. изключи „manual“).",
  },
  purchase: {
    label: "След покупка",
    hint: "След успешно плащане в Stripe. Задай продукт и/или сегмент в „Включване“.",
  },
  form_submit: {
    label: "След форма",
    hint: "След попълнена форма. Формата трябва да има задължителен имейл. Можеш да филтрираш по изборни отговори.",
  },
  segment_entry: {
    label: "Влизане в сегмент",
    hint: "Когато човекът за първи път влезе в избраните сегменти/групи — от форма, покупка, запис или ръчна промяна.",
  },
};

export const TRIGGER_SECTION_LABELS: Record<AutomationTrigger, string> = {
  new_subscriber: "Нов абонат",
  purchase: "След покупка",
  form_submit: "След форма",
  segment_entry: "Влизане в сегмент",
};

/** Maps legacy DB value `registration` until older rows are gone. */
export function normalizeAutomationTrigger(trigger: string): AutomationTrigger {
  if (trigger === "purchase") return "purchase";
  if (trigger === "form_submit") return "form_submit";
  if (trigger === "segment_entry") return "segment_entry";
  return "new_subscriber";
}

export function isFormSubmitSource(source: string | null | undefined): boolean {
  return (source ?? "").trim().toLowerCase().startsWith("form:");
}

export function formSlugFromSource(source: string | null | undefined): string | null {
  const raw = (source ?? "").trim();
  if (!raw.toLowerCase().startsWith("form:")) return null;
  const slug = raw.slice(5).trim();
  return slug || null;
}

export type ResolvedTriggerEvent =
  | AutomationTrigger
  | "registration";

/**
 * Which automation trigger_event values should load for this subscriber event.
 * `segment_entry` is always included — each rule still checks that the person
 * newly entered the target audience.
 */
export function resolveAutomationTriggerEvents(
  source: string,
  isNew: boolean,
): ResolvedTriggerEvent[] {
  const events: ResolvedTriggerEvent[] = [];

  if (source === "purchase") {
    events.push("purchase");
  } else if (isFormSubmitSource(source)) {
    events.push("form_submit");
    if (isNew || isSiteSignupSource(source)) {
      events.push("new_subscriber", "registration");
    }
  } else if (isSiteSignupSource(source) || isNew) {
    events.push("new_subscriber", "registration");
  }

  events.push("segment_entry");
  return events;
}

export function automationTriggerMatchesEvents(
  triggerEvent: string,
  events: string[],
): boolean {
  if (events.includes(triggerEvent)) return true;
  if (triggerEvent === "new_subscriber" && events.includes("registration")) {
    return true;
  }
  return false;
}
