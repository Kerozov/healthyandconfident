"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Segment } from "@/lib/supabase/types";
import {
  flattenSegmentTreeWithDepth,
  getDescendantKeys,
  isDescendantOf,
} from "@/lib/segments/hierarchy";
import { createSegment, deleteSegment, updateSegment } from "@/app/(admin)/admin/actions";
import { Field, Input, Card, Select } from "@/components/admin/fields";

function validParentOptions(segmentId: string | null, segments: Segment[]): Segment[] {
  return segments.filter(
    (s) =>
      s.key !== "all" &&
      s.id !== segmentId &&
      (segmentId ? !isDescendantOf(s.id, segmentId, segments) : true),
  );
}

export function SegmentsManager({ segments }: { segments: Segment[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: "",
    name: "",
    description: "",
    parent_id: "",
  });

  const tree = useMemo(
    () => flattenSegmentTreeWithDepth(segments.filter((s) => s.key !== "all")),
    [segments],
  );

  const parentOptions = useMemo(
    () => validParentOptions(null, segments),
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
        parent_id: form.parent_id || null,
      });
      if (!res.ok) {
        setError(res.message || "Грешка");
        return;
      }
      setForm({ key: "", name: "", description: "", parent_id: "" });
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

  function changeParent(id: string, parentId: string | null) {
    startTransition(async () => {
      const res = await updateSegment({ id, parent_id: parentId });
      if (!res.ok) setError(res.message || "Грешка при промяна на родител");
      else router.refresh();
    });
  }

  return (
    <Card title="Сегменти">
      <p className="mb-4 text-sm text-ink-soft">
        Сегментите се използват за кампании и автоматизации. Абонатите получават{" "}
        <code className="text-xs">key</code> на сегмента като таг. Можете да
        създавате подгрупи — при избор на родителска група се включват и всички
        нейни подгрупи.
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
        <Field label="Родителска група">
          <Select
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">— Главна група —</option>
            {parentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
        {tree.map(({ segment: s, depth }) => {
          const childCount = getDescendantKeys(s.key, segments).length;
          const parents = validParentOptions(s.id, segments);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              style={{ paddingLeft: 16 + depth * 20 }}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {depth > 0 && (
                    <span className="mr-1 text-ink-soft/50">↳</span>
                  )}
                  {s.name}
                  {childCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-ink-soft">
                      ({childCount} подгруп{childCount === 1 ? "а" : "и"})
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink-soft">
                  <code>{s.key}</code>
                  {s.description ? ` · ${s.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={s.parent_id ?? ""}
                  onChange={(e) => changeParent(s.id, e.target.value || null)}
                  disabled={pending}
                  className="h-9 min-w-[10rem] text-xs"
                >
                  <option value="">Главна група</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <button
                  onClick={() => remove(s.id, s.name)}
                  disabled={pending}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
