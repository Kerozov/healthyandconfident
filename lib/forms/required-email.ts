import type { FormField } from "@/lib/forms/types";

export function newRequiredEmailField(): FormField {
  return {
    id: `f_email_${Date.now().toString(36)}`,
    type: "email",
    label_bg: "Имейл",
    label_en: "Email",
    placeholder_bg: "ime@email.com",
    placeholder_en: "name@email.com",
    required: true,
  };
}

export function hasRequiredEmailField(
  fields: FormField[] | null | undefined,
): boolean {
  return (fields ?? []).some(
    (field) => field.type === "email" && field.required !== false,
  );
}

export function emailFieldCount(fields: FormField[] | null | undefined): number {
  return (fields ?? []).filter((field) => field.type === "email").length;
}

/** Force every email field to be required. Does not add a field if none exists. */
export function forceEmailFieldsRequired(fields: FormField[]): FormField[] {
  return fields.map((field) =>
    field.type === "email" ? { ...field, required: true } : field,
  );
}
