"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import { createSegment, deleteSegment, updateSegment } from "@/app/(admin)/admin/actions";
import { Field, Input, Card, Select } from "@/components/admin/fields";

export function SegmentsManager({
  segments,
  groups,
}: {
  segments: Segment[];
  groups: SegmentGroup[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    group_id: "",
  });

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );

  const sortedSegments = useMemo(
    () =>
      [...segments.filter((s) => s.key !== "all")].sort((a, b) =>
        a.name.localeCompare(b.name, "bg"),
      ),
    [segments],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createSegment({
        key: form.key || form.name,
        name: form.name,
        description: form.description || undefined,
        group_id: form.group_id || null,
      });
      if (!res.ok) {
        setError(res.message || "Грешка");
        return;
      }
      setForm({ key: "", name: "", description: "", group_id: "" });
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (
      !confirm(
        `Изтриване на група „${name}"? Таговете при абонатите не се премахват автоматично.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteSegment(id);
      router.refresh();
    });
  }

  function changeGroup(id: string, groupId: string | null) {
    startTransition(async () => {
      const res = await updateSegment({ id, group_id: groupId });
      if (!res.ok) setError(res.message || "Грешка при промяна на сегмент");
      else router.refresh();
    });
  }

  return (
    <Card title="Групи">
      <p className="mb-4 text-sm text-ink-soft">
        Групите са тагове върху абоната (форма, покупка, ръчно). При безплатното
        меню: колоната <strong className="text-slate-800">Интерес</strong> =
        „Безплатно меню“; колоната{" "}
        <strong className="text-slate-800">Групи</strong> = отговорът (диабет /
        ИР / отслабване). Сегментът само обединява групи.
      </p>

      <form onSubmit={submit} className="mb-6 grid gap-4 md:grid-cols-5">
        <Field label="Име">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Диабет"
            required
          />
        </Field>
        <Field label="Ключ (по избор)" hint="Автоматично от името, ако е празно.">
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="diabet"
          />
        </Field>
        <Field label="Сегмент">
          <Select
            value={form.group_id}
            onChange={(e) => setForm({ ...form, group_id: e.target.value })}
          >
            <option value="">— Без сегмент —</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Описание">
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="По избор"
          />
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending || !form.name}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Добави група
          </button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm text-coral-600">{error}</p>}

      <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
        {sortedSegments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Няма групи.</p>
        ) : (
          sortedSegments.map((segment) => (
            <div
              key={segment.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{segment.name}</p>
                <p className="text-xs text-ink-soft">
                  <code>{segment.key}</code>
                  {segment.group_id
                    ? ` · сегмент: ${groupNameById.get(segment.group_id) ?? "—"}`
                    : " · без сегмент"}
                  {segment.description ? ` · ${segment.description}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Select
                  value={segment.group_id ?? ""}
                  onChange={(e) => changeGroup(segment.id, e.target.value || null)}
                  disabled={pending}
                  className="!h-9 !min-h-9 !w-auto !min-w-[9.5rem] !rounded-lg !px-3 !py-0 text-xs leading-none"
                >
                  <option value="">Без сегмент</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => remove(segment.id, segment.name)}
                  disabled={pending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                  aria-label={`Изтрий ${segment.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
