"use client";

import type { FormFieldOption } from "@/lib/forms/types";
import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import {
  assignableSegments,
  flattenGroupTreeWithDepth,
  segmentsByGroupId,
} from "@/lib/segments/hierarchy";
import { Plus, Trash2 } from "lucide-react";
import { Input, Select } from "@/components/admin/fields";

export function FormOptionSegmentEditor({
  options,
  segments,
  groups,
  onChange,
  disabled,
}: {
  options: FormFieldOption[];
  segments: Segment[];
  groups: SegmentGroup[];
  onChange: (options: FormFieldOption[]) => void;
  disabled?: boolean;
}) {
  const byGroup = segmentsByGroupId(segments);
  const tree = flattenGroupTreeWithDepth(groups);
  const ungrouped = byGroup.get(null) ?? [];

  function update(index: number, patch: Partial<FormFieldOption>) {
    const next = options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt));
    onChange(next);
  }

  function remove(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function add() {
    const n = options.length + 1;
    onChange([
      ...options,
      {
        value: `option_${n}`,
        label_bg: `Опция ${n}`,
        label_en: `Option ${n}`,
        segment_key: null,
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        За всеки отговор избери към кой сегмент да отиде човекът след попълване.
      </p>
      {options.map((opt, index) => (
        <div
          key={`${opt.value}-${index}`}
          className="space-y-2 rounded-xl border border-ink/10 bg-white p-3"
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={opt.label_bg}
              disabled={disabled}
              onChange={(e) => update(index, { label_bg: e.target.value })}
              placeholder="Етикет BG"
            />
            <Input
              value={opt.label_en}
              disabled={disabled}
              onChange={(e) => update(index, { label_en: e.target.value })}
              placeholder="Етикет EN"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(index)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-coral-600 hover:bg-coral-500/10 disabled:opacity-50"
              aria-label="Премахни опция"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={opt.segment_key ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const segment_key = e.target.value || null;
                update(index, {
                  segment_key,
                  // Keep value in sync with segment when empty/custom
                  value: segment_key || opt.value || `option_${index + 1}`,
                });
              }}
            >
              <option value="">— Без сегмент —</option>
              {ungrouped.map((s) => (
                <option key={s.id} value={s.key}>
                  {s.name}
                </option>
              ))}
              {tree.map(({ group, depth }) => {
                const list = byGroup.get(group.id) ?? [];
                if (list.length === 0) return null;
                const prefix = depth > 0 ? `${"–".repeat(depth)} ` : "";
                return (
                  <optgroup key={group.id} label={`${prefix}${group.name}`}>
                    {list.map((s) => (
                      <option key={s.id} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
            <Input
              value={opt.value}
              disabled={disabled}
              onChange={(e) => update(index, { value: e.target.value })}
              placeholder="Вътрешна стойност"
            />
          </div>
        </div>
      ))}
      {assignableSegments(segments).length === 0 && (
        <p className="text-xs text-coral-600">
          Няма сегменти — създай ги първо в Сегменти, после ги вържи към отговорите.
        </p>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink/20 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        <Plus className="h-3.5 w-3.5" /> Добави отговор
      </button>
    </div>
  );
}
