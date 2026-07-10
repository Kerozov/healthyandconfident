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
        `Изтриване на сегмент „${name}"? Таговете при абонатите не се премахват автоматично.`,
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
      if (!res.ok) setError(res.message || "Грешка при промяна на група");
      else router.refresh();
    });
  }

  return (
    <Card title="Сегменти">
      <p className="mb-4 text-sm text-ink-soft">
        Сегментите са тагове, които се присвояват на абонати (popup, форма, покупка,
        ръчно). При записване от сайта „Какво те вълнува?“ също става сегмент — виж
        колоната <strong className="text-slate-800">Интерес</strong> при Абонати.
        Групата е само за организация — не се записва на абоната.
      </p>

      <form onSubmit={submit} className="mb-6 grid gap-4 md:grid-cols-5">
        <Field label="Име">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VIP клиенти"
            required
          />
        </Field>
        <Field label="Ключ (по избор)" hint="Автоматично от името, ако е празно.">
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="vip-klienti"
          />
        </Field>
        <Field label="Група">
          <Select
            value={form.group_id}
            onChange={(e) => setForm({ ...form, group_id: e.target.value })}
          >
            <option value="">— Без група —</option>
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
            Добави сегмент
          </button>
        </div>
      </form>
      {error && <p className="mb-4 text-sm text-coral-600">{error}</p>}

      <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
        {sortedSegments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Няма сегменти.</p>
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
                    ? ` · група: ${groupNameById.get(segment.group_id) ?? "—"}`
                    : " · без група"}
                  {segment.description ? ` · ${segment.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={segment.group_id ?? ""}
                  onChange={(e) => changeGroup(segment.id, e.target.value || null)}
                  disabled={pending}
                  className="h-9 min-w-[10rem] text-xs"
                >
                  <option value="">Без група</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={() => remove(segment.id, segment.name)}
                  disabled={pending}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
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
