"use client";

import type { Locale } from "@/i18n/config";
import { HEALTH_INTEREST_OPTIONS } from "@/lib/site/health-tags";
import { cn } from "@/lib/utils";

export function HealthInterestField({
  locale,
  name,
  value,
  required,
  label,
  hint,
  onChange,
}: {
  locale: Locale;
  name: string;
  value: string;
  required?: boolean;
  label: string;
  hint?: string;
  onChange: (tag: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-coral-500"> *</span>}
      </legend>
      {hint && <p className="mb-3 text-xs text-ink-soft">{hint}</p>}
      <div className="space-y-2">
        {HEALTH_INTEREST_OPTIONS.map((opt) => {
          const optionLabel = locale === "en" ? opt.label_en : opt.label_bg;
          const checked = value === opt.tag;
          return (
            <label
              key={opt.tag}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                checked
                  ? "border-forest-400 bg-forest-500/10 text-slate-800"
                  : "border-ink/10 bg-white/90 text-slate-700 hover:border-forest-200",
              )}
            >
              <input
                type="radio"
                name={name}
                required={required}
                checked={checked}
                onChange={() => onChange(opt.tag)}
                className="mt-0.5 h-4 w-4 border-forest-300 text-forest-600 focus:ring-forest-300"
              />
              <span>{optionLabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
