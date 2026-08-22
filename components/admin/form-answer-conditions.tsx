"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { FormAnswerCondition } from "@/lib/automation/form-conditions";
import {
  choiceFieldsOf,
  isChoiceField,
} from "@/lib/automation/form-conditions";
import { hasRequiredEmailField } from "@/lib/forms/required-email";
import { Field, Select } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

export function FormTriggerPicker({
  forms,
  selectedId,
  onChange,
  disabled,
}: {
  forms: FormTemplateRecord[];
  selectedId: string;
  onChange: (formId: string) => void;
  disabled?: boolean;
}) {
  const selected = forms.find((f) => f.id === selectedId);

  return (
    <div className="space-y-3">
      <Field
        label="Форма"
        hint="Автоматизацията тръгва след всяко попълване на тази форма. Имейлът във формата е задължителен."
      >
        <Select
          value={selectedId}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Избери форма —</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.title_bg?.trim() || form.name} ({form.slug})
            </option>
          ))}
        </Select>
      </Field>
      {selected && !hasRequiredEmailField(selected.fields) && (
        <p className="rounded-xl border border-coral-200 bg-coral-50 px-3 py-2 text-xs text-coral-800">
          Тази форма няма задължителен имейл. Добави го в Форми, иначе автоматизацията
          няма да може да се запише.
        </p>
      )}
    </div>
  );
}

export function FormAnswerConditionsEditor({
  form,
  conditions,
  onChange,
  disabled,
}: {
  form: FormTemplateRecord | null;
  conditions: FormAnswerCondition[];
  onChange: (next: FormAnswerCondition[]) => void;
  disabled?: boolean;
}) {
  const choiceFields = choiceFieldsOf(form?.fields);

  if (!form) {
    return (
      <p className="text-sm text-ink-soft">
        Избери форма, за да филтрираш по отговори.
      </p>
    );
  }

  if (choiceFields.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Тази форма няма въпроси с избор (dropdown, бутони или чекбоксове) —
        автоматизацията тръгва след всяко попълване. Свободен текст не се ползва
        като условие.
      </p>
    );
  }

  function updateAt(index: number, patch: Partial<FormAnswerCondition>) {
    onChange(conditions.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-ink-soft">
        Всички редове трябва да минат (И). В един ред няколко отговора = ИЛИ.
        „Не пращай“ спира веригата, ако човекът е избрал този отговор.
      </p>
      {conditions.map((condition, index) => {
        const field =
          choiceFields.find((f) => f.id === condition.field_id) ?? null;
        const options = field?.options ?? [];
        return (
          <div
            key={`${condition.field_id}-${index}`}
            className="space-y-3 rounded-xl border border-ink/10 bg-white p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="inline-flex rounded-lg border border-ink/15 bg-cream-2/40 p-0.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateAt(index, { mode: "include" })}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold",
                    condition.mode !== "exclude"
                      ? "bg-forest-600 text-cream"
                      : "text-ink-soft",
                  )}
                >
                  Прати ако
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateAt(index, { mode: "exclude" })}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold",
                    condition.mode === "exclude"
                      ? "bg-coral-600 text-white"
                      : "text-ink-soft",
                  )}
                >
                  Не пращай ако
                </button>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(conditions.filter((_, i) => i !== index))
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-coral-600 hover:bg-coral-50"
                aria-label="Премахни условие"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Field label="Въпрос">
              <Select
                value={condition.field_id}
                disabled={disabled}
                onChange={(e) =>
                  updateAt(index, { field_id: e.target.value, values: [] })
                }
              >
                <option value="">— Избери въпрос —</option>
                {choiceFields.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label_bg?.trim() || choice.label_en || choice.id}
                  </option>
                ))}
              </Select>
            </Field>
            {field && isChoiceField(field) && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink">Отговор</p>
                {options.length === 0 ? (
                  <p className="text-xs text-ink-soft">Няма дефинирани опции.</p>
                ) : (
                  options.map((opt) => {
                    const checked = condition.values.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                          checked
                            ? condition.mode === "exclude"
                              ? "border-coral-300 bg-coral-50 text-coral-900"
                              : "border-forest-400/40 bg-forest-50 text-forest-900"
                            : "border-ink/10 bg-cream-2/30 text-ink-soft",
                          disabled && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => {
                            const values = checked
                              ? condition.values.filter((v) => v !== opt.value)
                              : [...condition.values, opt.value];
                            updateAt(index, { values });
                          }}
                        />
                        <span>
                          {opt.label_bg?.trim() || opt.label_en || opt.value}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...conditions,
            { field_id: "", values: [], mode: "include" },
          ])
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" />
        Добави условие
      </button>
    </div>
  );
}
