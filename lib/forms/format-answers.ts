import type { FormField } from "@/lib/forms/types";
import { healthLabelForTag } from "@/lib/site/health-tags";

function formatAnswerValue(
  value: unknown,
  field?: FormField,
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Да" : "Не";

  if (field?.type === "health_interest" && typeof value === "string") {
    return healthLabelForTag(value, "bg");
  }

  const optionLabel = (raw: string) => {
    const match = field?.options?.find((option) => option.value === raw);
    return match?.label_bg || raw;
  };

  if (Array.isArray(value)) {
    return value.map((item) => optionLabel(String(item))).join(", ");
  }

  if (field?.options?.length) {
    return optionLabel(String(value));
  }

  return String(value);
}

/** Human-readable Q&A rows for admin form submission tables. */
export function formatSubmissionAnswers(
  fields: FormField[],
  answers: Record<string, string | string[] | boolean>,
): { label: string; value: string }[] {
  const used = new Set<string>();
  const rows: { label: string; value: string }[] = [];

  for (const field of fields) {
    if (field.type === "heading") continue;
    if (!(field.id in answers)) continue;
    used.add(field.id);
    rows.push({
      label: field.label_bg || field.label_en || field.id,
      value: formatAnswerValue(answers[field.id], field),
    });
  }

  for (const [key, value] of Object.entries(answers)) {
    if (used.has(key)) continue;
    rows.push({ label: key, value: formatAnswerValue(value) });
  }

  return rows;
}
