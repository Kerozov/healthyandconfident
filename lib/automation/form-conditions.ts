import type { FormField } from "@/lib/forms/types";

export const FORM_CHOICE_FIELD_TYPES = ["select", "radio", "checkbox"] as const;

export type FormChoiceFieldType = (typeof FORM_CHOICE_FIELD_TYPES)[number];

export type FormAnswerConditionMode = "include" | "exclude";

/** One filter on a choice question (dropdown / radio / checkbox). */
export type FormAnswerCondition = {
  field_id: string;
  /** Option values defined on the form field. OR within the list. */
  values: string[];
  /** include = must have answered this way; exclude = skip if they did. */
  mode: FormAnswerConditionMode;
};

export function isChoiceField(
  field: FormField,
): field is FormField & { type: FormChoiceFieldType } {
  return (
    field.type === "select" ||
    field.type === "radio" ||
    field.type === "checkbox"
  );
}

export function choiceFieldsOf(fields: FormField[] | null | undefined): FormField[] {
  return (fields ?? []).filter(isChoiceField);
}

function selectedValues(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

export function parseFormAnswerConditions(raw: unknown): FormAnswerCondition[] {
  if (!Array.isArray(raw)) return [];
  const out: FormAnswerCondition[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const field_id =
      typeof row.field_id === "string" ? row.field_id.trim() : "";
    const mode: FormAnswerConditionMode =
      row.mode === "exclude" ? "exclude" : "include";
    const values = Array.isArray(row.values)
      ? row.values.map((v) => String(v).trim()).filter(Boolean)
      : [];
    if (!field_id || values.length === 0) continue;
    out.push({ field_id, values, mode });
  }
  return out;
}

function conditionHits(
  condition: FormAnswerCondition,
  answers: Record<string, unknown>,
): boolean {
  const selected = selectedValues(answers[condition.field_id]);
  return condition.values.some((value) => selected.includes(value));
}

/**
 * All conditions must pass (AND). Within one condition, any listed value
 * counts (OR). Incomplete rows are ignored.
 */
export function formAnswersMatchConditions(
  conditions: FormAnswerCondition[] | unknown,
  answers: Record<string, unknown> | null | undefined,
): boolean {
  const list = parseFormAnswerConditions(conditions);
  if (list.length === 0) return true;
  const given = answers ?? {};
  for (const condition of list) {
    const hit = conditionHits(condition, given);
    if (condition.mode === "include" && !hit) return false;
    if (condition.mode === "exclude" && hit) return false;
  }
  return true;
}

export function formatFormAnswerConditionsLine(
  conditions: FormAnswerCondition[] | unknown,
  fields: FormField[] | null | undefined,
): string | null {
  const list = parseFormAnswerConditions(conditions);
  if (list.length === 0) return null;
  const byId = new Map((fields ?? []).map((f) => [f.id, f]));
  const parts = list.map((condition) => {
    const field = byId.get(condition.field_id);
    const question =
      field?.label_bg?.trim() || field?.label_en?.trim() || "въпрос";
    const labels = condition.values.map((value) => {
      const opt = field?.options?.find((o) => o.value === value);
      return opt?.label_bg?.trim() || opt?.label_en?.trim() || value;
    });
    const verb = condition.mode === "exclude" ? "не" : "да";
    return `${verb}: ${question} = ${labels.join(" / ")}`;
  });
  return parts.join(" · ");
}
