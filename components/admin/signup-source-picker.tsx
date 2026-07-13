"use client";

import { cn } from "@/lib/utils";
import {
  buildSignupSourceGroups,
  type SignupSourceGroup,
} from "@/lib/automation/signup-sources";

export function SignupSourcePicker({
  forms,
  selected,
  onChange,
  disabled,
}: {
  forms: { slug: string; name: string; title_bg: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const groups = buildSignupSourceGroups(forms);

  function toggle(value: string) {
    if (disabled) return;
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-soft">
        За автоматизация при конкретна форма: изберете формата по-долу. Празно =
        всички източници (меню, popup, всяка форма). Това не е сегмент — филтрира
        само откъде е дошъл записът при това събитие.
      </p>
      {groups.map((group) => (
        <GroupBlock
          key={group.id}
          group={group}
          selected={selected}
          onToggle={toggle}
          disabled={disabled}
        />
      ))}
      {selected.length > 0 && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className="text-xs font-medium text-ink-soft underline hover:text-ink"
        >
          Изчисти източниците
        </button>
      )}
    </div>
  );
}

function GroupBlock({
  group,
  selected,
  onToggle,
  disabled,
}: {
  group: SignupSourceGroup;
  selected: string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-cream-2/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
        {group.label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {group.options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(opt.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-forest-500 bg-forest-500/10 text-forest-800"
                  : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
                disabled && "opacity-60",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
