"use client";

import { Field, Input } from "@/components/admin/fields";
import { ACADEMY_ALL_PROGRAMS } from "@/lib/academy/product";

/**
 * Whether a buyer of this product gets a course code from the academy. The
 * value is `""` (no code), `"*"` (the academy's default — every program) or a
 * product / school slug. The code goes into emails as `{{course_code}}`.
 */
export function AcademyProductField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const on = value.trim() !== "";
  const slug = value === ACADEMY_ALL_PROGRAMS ? "" : value;
  return (
    <div className="rounded-xl border border-forest-500/20 bg-forest-50/30 p-4 space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-forest-800">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? ACADEMY_ALL_PROGRAMS : "")}
          disabled={disabled}
        />
        Купувачът получава код за курс от академията
      </label>
      {on ? (
        <>
          <p className="text-xs text-ink-soft">
            В имейла на автоматизацията „Покупка“ го слагаш с {"{{course_code}}"}. Кодът отключва
            всички програми; попълни долното само ако в академията има продукт за част от тях.
          </p>
          <Field label="Продукт в академията (по желание)" htmlFor="academy-product">
            <Input
              id="academy-product"
              value={slug}
              placeholder="празно = всички програми"
              onChange={(e) => onChange(e.target.value.trim() ? e.target.value : ACADEMY_ALL_PROGRAMS)}
              disabled={disabled}
            />
          </Field>
        </>
      ) : null}
    </div>
  );
}
