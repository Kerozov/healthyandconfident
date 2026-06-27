"use client";

import type { Segment } from "@/lib/supabase/types";
import {
  flattenSegmentTreeWithDepth,
  getDescendantKeys,
} from "@/lib/segments/hierarchy";
import { cn } from "@/lib/utils";

/** Segments assignable to a subscriber (excludes pseudo "all"). */
export function assignableSegments(segments: Segment[]): Segment[] {
  return segments.filter((s) => s.key !== "all");
}

export function parseTagList(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function mergeTags(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat()));
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
  const tree = flattenSegmentTreeWithDepth(options);

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-soft">Няма сегменти — създайте първи по-горе.</p>
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
    <div className="flex flex-col gap-2">
      {tree.map(({ segment: s, depth }) => {
        const checked = selected.includes(s.key);
        const childCount = getDescendantKeys(s.key, segments).length;
        return (
          <label
            key={s.id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-forest-500/40 bg-forest-500/10 text-forest-700"
                : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
              disabled && "cursor-not-allowed opacity-60",
            )}
            style={{ marginLeft: depth * 16 }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-ink/20 text-forest-600 focus:ring-forest-500/30"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(s.key)}
            />
            <span className="min-w-0">
              <span className="font-medium text-ink">{s.name}</span>
              {childCount > 0 && (
                <span className="ml-1.5 text-xs text-ink-soft/80">
                  (+{childCount} подгруп{childCount === 1 ? "а" : "и"})
                </span>
              )}
            </span>
          </label>
        );
      })}
      <p className="text-xs text-ink-soft">
        Избрана родителска група автоматично включва всички нейни подгрупи.
      </p>
    </div>
  );
}
