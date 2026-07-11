import type { FormField } from "@/lib/forms/types";
import { HEALTH_INTEREST_OPTIONS } from "@/lib/site/health-tags";

export type FormFieldDefault = {
  id: string;
  name: string;
  description: string;
  builtin?: boolean;
  field: Omit<FormField, "id">;
};

export const BUILTIN_FIELD_DEFAULTS: FormFieldDefault[] = [
  {
    id: "interest-menu",
    name: "Интерес (като менюто)",
    description: "Диабет / ИР / общо → съответния сегмент",
    builtin: true,
    field: {
      type: "radio",
      label_bg: "С какво можем да ти помогнем?",
      label_en: "How can we help you?",
      help_bg: "Избери едно — ще ти пратим най-подходящото съдържание.",
      help_en: "Choose one — we'll send the most relevant content.",
      required: true,
      options: HEALTH_INTEREST_OPTIONS.map((opt) => ({
        value: opt.tag,
        label_bg: opt.label_bg,
        label_en: opt.label_en,
        segment_key: opt.tag,
      })),
    },
  },
];

const STORAGE_KEY = "hc_form_field_defaults";

export function readCustomFieldDefaults(): FormFieldDefault[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FormFieldDefault[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((d) => d && d.id && d.field && d.name);
  } catch {
    return [];
  }
}

export function writeCustomFieldDefaults(defaults: FormFieldDefault[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
}

export function listFieldDefaults(): FormFieldDefault[] {
  return [...BUILTIN_FIELD_DEFAULTS, ...readCustomFieldDefaults()];
}

export function saveFieldAsDefault(input: {
  name: string;
  description?: string;
  field: FormField;
}): FormFieldDefault {
  const { id: _id, ...rest } = input.field;
  const created: FormFieldDefault = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    description: input.description?.trim() || "Персонален шаблон",
    field: rest,
  };
  const next = [...readCustomFieldDefaults(), created];
  writeCustomFieldDefaults(next);
  return created;
}

export function deleteCustomFieldDefault(id: string): void {
  writeCustomFieldDefaults(readCustomFieldDefaults().filter((d) => d.id !== id));
}
