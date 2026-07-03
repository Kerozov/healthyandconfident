"use client";

import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import {
  assignableSegments,
  buildSegmentPickerRows,
  getSegmentKeysForGroup,
} from "@/lib/segments/hierarchy";
import { cn } from "@/lib/utils";

export { assignableSegments };

export function parseTagList(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function mergeTags(...groups: string[][]): string[] {
  return Array.from(new Set(groups.flat()));
}

/** Assign segments to subscribers — segments only, groups shown as headers. */
export function SegmentAssignChecklist({
  segments,
  groups,
  selected,
  onChange,
  disabled,
}: {
  segments: Segment[];
  groups: SegmentGroup[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}) {
  const rows = buildSegmentPickerRows(groups, segments);

  if (assignableSegments(segments).length === 0) {
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
      {rows.map((row, index) => {
        if (row.type === "group" && row.group) {
          return (
            <div
              key={`group-${row.group.id}`}
              className="pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft"
              style={{ marginLeft: row.depth * 16, paddingTop: index > 0 ? 8 : 0 }}
            >
              {row.group.name}
            </div>
          );
        }
        if (!row.segment) return null;
        const checked = selected.includes(row.segment.key);
        return (
          <label
            key={row.segment.id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              checked
                ? "border-forest-500/40 bg-forest-500/10 text-forest-700"
                : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
              disabled && "cursor-not-allowed opacity-60",
            )}
            style={{ marginLeft: row.depth * 16 }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 rounded border-ink/20 text-forest-600 focus:ring-forest-500/30"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(row.segment!.key)}
            />
            <span className="min-w-0 font-medium text-ink">{row.segment.name}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Target campaigns/automations — groups and segments are both selectable. */
export function AudienceTargetChecklist({
  segments,
  groups,
  selectedSegmentKeys,
  selectedGroupIds,
  onChangeSegments,
  onChangeGroups,
  disabled,
  variant = "include",
}: {
  segments: Segment[];
  groups: SegmentGroup[];
  selectedSegmentKeys: string[];
  selectedGroupIds: string[];
  onChangeSegments: (keys: string[]) => void;
  onChangeGroups: (ids: string[]) => void;
  disabled?: boolean;
  /** include = зелено/златно; exclude = червено — за изключване от автоматизация */
  variant?: "include" | "exclude";
}) {
  const rows = buildSegmentPickerRows(groups, segments);

  if (assignableSegments(segments).length === 0 && groups.length === 0) {
    return (
      <p className="text-sm text-ink-soft">Няма сегменти или групи — създайте първи по-горе.</p>
    );
  }

  function toggleSegment(key: string) {
    if (disabled) return;
    onChangeSegments(
      selectedSegmentKeys.includes(key)
        ? selectedSegmentKeys.filter((k) => k !== key)
        : [...selectedSegmentKeys, key],
    );
  }

  function toggleGroup(id: string) {
    if (disabled) return;
    onChangeGroups(
      selectedGroupIds.includes(id)
        ? selectedGroupIds.filter((g) => g !== id)
        : [...selectedGroupIds, id],
    );
  }

  const isExclude = variant === "exclude";
  const groupCheckedClass = isExclude
    ? "border-coral-500/50 bg-coral-500/10 text-coral-800"
    : "border-gold-500/50 bg-gold-400/10 text-ink";
  const segmentCheckedClass = isExclude
    ? "border-coral-500/40 bg-coral-500/10 text-coral-800"
    : "border-forest-500/40 bg-forest-500/10 text-forest-700";
  const groupCheckboxClass = isExclude
    ? "text-coral-600 focus:ring-coral-500/30"
    : "text-gold-600 focus:ring-gold-500/30";
  const segmentCheckboxClass = isExclude
    ? "text-coral-600 focus:ring-coral-500/30"
    : "text-forest-600 focus:ring-forest-500/30";

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => {
        if (row.type === "group" && row.group) {
          const checked = selectedGroupIds.includes(row.group.id);
          const segmentCount = getSegmentKeysForGroup(row.group.id, groups, segments).length;
          return (
            <label
              key={`group-${row.group.id}`}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                checked ? groupCheckedClass : "border-ink/15 bg-cream-2/40 text-ink-soft hover:border-ink/25",
                disabled && "cursor-not-allowed opacity-60",
              )}
              style={{ marginLeft: row.depth * 16, marginTop: index > 0 ? 4 : 0 }}
            >
              <input
                type="checkbox"
                className={cn(
                  "h-4 w-4 shrink-0 rounded border-ink/20",
                  groupCheckboxClass,
                )}
                checked={checked}
                disabled={disabled}
                onChange={() => toggleGroup(row.group.id)}
              />
              <span className="min-w-0">
                <span className="font-semibold text-ink">{row.group.name}</span>
                <span className="ml-1.5 text-xs text-ink-soft">
                  (група · {segmentCount} сегмент{segmentCount === 1 ? "" : "а"})
                </span>
              </span>
            </label>
          );
        }
        if (!row.segment) return null;
        const checked = selectedSegmentKeys.includes(row.segment.key);
        return (
          <label
            key={row.segment.id}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              checked ? segmentCheckedClass : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
              disabled && "cursor-not-allowed opacity-60",
            )}
            style={{ marginLeft: row.depth * 16 }}
          >
            <input
              type="checkbox"
              className={cn(
                "h-4 w-4 shrink-0 rounded border-ink/20",
                segmentCheckboxClass,
              )}
              checked={checked}
              disabled={disabled}
              onChange={() => toggleSegment(row.segment!.key)}
            />
            <span className="min-w-0 font-medium text-ink">{row.segment.name}</span>
          </label>
        );
      })}
      <p className="text-xs text-ink-soft">
        {isExclude
          ? "Ако абонатът е в някоя от избраните групи или сегменти — този имейл/SMS няма да се изпрати."
          : "Групата включва всички сегменти в нея и вложените подгрупи."}
      </p>
    </div>
  );
}

/** @deprecated Use SegmentAssignChecklist or AudienceTargetChecklist */
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
  return (
    <SegmentAssignChecklist
      segments={segments}
      groups={[]}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
