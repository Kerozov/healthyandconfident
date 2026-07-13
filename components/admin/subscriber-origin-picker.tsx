"use client";

import { cn } from "@/lib/utils";
import {
  ALL_SUBSCRIBER_ORIGINS,
  SUBSCRIBER_ORIGIN_OPTIONS,
  type SubscriberOrigin,
} from "@/lib/automation/subscriber-origins";

export function SubscriberOriginPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: SubscriberOrigin[];
  onChange: (values: SubscriberOrigin[]) => void;
  disabled?: boolean;
}) {
  function toggle(value: SubscriberOrigin) {
    if (disabled) return;
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        Кой тип запис задейства автоматизацията. Празно = по подразбиране (нови +
        вече регистрирани от сайт). Не е сегмент и не е източник (форма/меню).
      </p>
      <p className="rounded-lg border border-violet-200/80 bg-white/80 px-3 py-2 text-xs leading-relaxed text-violet-950">
        Всяка автоматизация е отделна. Ако някой вече е минал през серия А, може да
        влезе в серия Б (напр. нова форма) — стига тук да е избран подходящият тип и
        по-долу конкретният източник. Блокира се само повторно изпращане на{" "}
        <strong>същата стъпка от същата</strong> автоматизация, не всички бъдещи
        имейли.
      </p>
      <div className="flex flex-wrap gap-2">
        {SUBSCRIBER_ORIGIN_OPTIONS.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              title={opt.hint}
              onClick={() => toggle(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-violet-500 bg-violet-500/10 text-violet-900"
                  : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
                disabled && "opacity-60",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([...ALL_SUBSCRIBER_ORIGINS])}
            className="text-xs font-medium text-ink-soft underline hover:text-ink"
          >
            Избери всички
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange([])}
            className="text-xs font-medium text-ink-soft underline hover:text-ink"
          >
            По подразбиране
          </button>
        </div>
      )}
    </div>
  );
}
