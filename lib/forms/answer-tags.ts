import type { FormField, FormFieldOption } from "@/lib/forms/types";
import {
  ALL_HEALTH_TAG_KEYS,
  applyHealthSelectionToTags,
  HEALTH_INTEREST_OPTIONS,
  healthSelectionFromAnswerKey,
} from "@/lib/site/health-tags";

/** Convert legacy health_interest fields into mapped radio fields. */
export function normalizeFormFields(fields: FormField[]): FormField[] {
  return fields.map((field) => {
    if (field.type !== "health_interest") return field;
    return {
      ...field,
      type: "radio",
      help_bg:
        field.help_bg ||
        "Избери едно — ще ти пратим най-подходящото съдържание.",
      help_en:
        field.help_en ||
        "Choose one — we'll send the most relevant content.",
      options: HEALTH_INTEREST_OPTIONS.map((opt) => ({
        value: opt.tag,
        label_bg: opt.label_bg,
        label_en: opt.label_en,
        segment_key: opt.tag,
      })),
    };
  });
}

function tagsForSelectedValues(
  options: FormFieldOption[] | undefined,
  selected: string[],
): string[] {
  if (!options?.length || selected.length === 0) return [];
  const tags: string[] = [];
  for (const value of selected) {
    const opt = options.find((o) => o.value === value);
    const key = opt?.segment_key?.trim();
    if (key) tags.push(key);
  }
  return tags;
}

/** Segment tags implied by answered choice fields (radio / select / checkbox / legacy). */
export function tagsFromMappedAnswers(
  fields: FormField[],
  answers: Record<string, unknown>,
): string[] {
  const normalized = normalizeFormFields(fields);
  const tags: string[] = [];

  for (const field of normalized) {
    if (
      field.type !== "radio" &&
      field.type !== "select" &&
      field.type !== "checkbox"
    ) {
      continue;
    }
    const raw = answers[field.id];
    const selected = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === "string" && raw
        ? [raw]
        : [];
    tags.push(...tagsForSelectedValues(field.options, selected));
  }

  return Array.from(new Set(tags));
}

/**
 * Merge existing subscriber tags with answer-mapped + fixed tags.
 * Health interest keys replace each other (one interest), other tags accumulate.
 */
export function mergeAnswerTagsIntoSubscriber(
  existing: string[],
  answerTags: string[],
  fixedTags: string[],
): string[] {
  let next = [...existing];
  const healthAnswers = answerTags.filter((t) =>
    (ALL_HEALTH_TAG_KEYS as string[]).includes(t),
  );
  const otherAnswers = answerTags.filter(
    (t) => !(ALL_HEALTH_TAG_KEYS as string[]).includes(t),
  );

  if (healthAnswers.length > 0) {
    const selection = healthSelectionFromAnswerKey(healthAnswers[0]!);
    if (selection) {
      next = applyHealthSelectionToTags(next, selection);
    }
  }

  for (const tag of [...otherAnswers, ...fixedTags]) {
    if (!next.includes(tag)) next.push(tag);
  }
  return next;
}
