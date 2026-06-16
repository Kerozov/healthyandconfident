"use client";

import type { Segment } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/** Segments assignable to a subscriber (excludes pseudo "all"). */
export function assignableSegments(segments: Segment[]): Segment[] {
  return segments.filter((s) => s.key !== "all");
}

export function SegmentChecklist({
  segments,
  selected,
  onChange,
  disabled,
}: {
  segments: Segment[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}) {
  const options = assignableSegments(segments);

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-soft">No segments yet — create one above.</p>
    );
  }

  function toggle(key: string) {
    if (disabled) return;
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((s) => {
        const checked = selected.includes(s.key);
        return (
          <label
            key={s.id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              checked
                ? "border-forest-500/40 bg-forest-500/10 text-forest-700"
                : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink/20 text-forest-600 focus:ring-forest-500/30"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(s.key)}
            />
            <span>{s.name}</span>
          </label>
        );
      })}
    </div>
  );
}
