"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { SegmentGroup } from "@/lib/supabase/types";
import {
  flattenGroupTreeWithDepth,
  getDescendantGroupIds,
  getSegmentKeysForGroup,
  isDescendantGroup,
} from "@/lib/segments/hierarchy";
import {
  createSegmentGroup,
  deleteSegmentGroup,
  updateSegmentGroup,
} from "@/app/(admin)/admin/actions";
import { Field, Input, Card, Select } from "@/components/admin/fields";

function validParentOptions(groupId: string | null, groups: SegmentGroup[]): SegmentGroup[] {
  return groups.filter(
    (group) =>
      group.id !== groupId &&
      (groupId ? !isDescendantGroup(group.id, groupId, groups) : true),
  );
}

export function GroupsManager({ groups }: { groups: SegmentGroup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    parent_id: "",
  });

  const tree = useMemo(() => flattenGroupTreeWithDepth(groups), [groups]);
  const parentOptions = useMemo(() => validParentOptions(null, groups), [groups]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createSegmentGroup({
        name: form.name,
        description: form.description || undefined,
        parent_id: form.parent_id || null,
      });
      if (!res.ok) {
        setError(res.message || "Грешка");
        return;
      }
      setForm({ name: "", description: "", parent_id: "" });
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (
      !confirm(
        `Изтриване на група „${name}"? Сегментите остават, но се откачат от групата.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteSegmentGroup(id);
      router.refresh();
    });
  }

  function changeParent(id: string, parentId: string | null) {
    startTransition(async () => {
      const res = await updateSegmentGroup({ id, parent_id: parentId });
      if (!res.ok) setError(res.message || "Грешка при промяна на родител");
      else router.refresh();
    });
  }

  return (
    <Card title="Групи">
      <p className="mb-4 text-sm text-ink-soft">
        Групите организират сегментите — не се присвояват директно на абонати.
        При кампания или автоматизация избор на група включва всички сегменти в
        нея (и вложените подгрупи).
      </p>

      <form onSubmit={submit} className="mb-6 grid gap-4 md:grid-cols-4">
        <Field label="Име на група">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Програми"
            required
          />
        </Field>
        <Field label="Родителска група">
          <Select
            value={form.parent_id}
            onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          >
            <option value="">— Главна група —</option>
            {parentOptions.map((group) => (
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

      {tree.length === 0 ? (
        <p className="text-sm text-ink-soft">Няма групи — създайте първа по-горе.</p>
      ) : (
        <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
          {tree.map(({ group, depth }) => {
            const childCount = getDescendantGroupIds(group.id, groups).length;
            const parents = validParentOptions(group.id, groups);
            return (
              <div
                key={group.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
                style={{ paddingLeft: 16 + depth * 20 }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {depth > 0 && (
                      <span className="mr-1 text-ink-soft/50">↳</span>
                    )}
                    {group.name}
                    {childCount > 0 && (
                      <span className="ml-2 text-xs font-normal text-ink-soft">
                        ({childCount} подгруп{childCount === 1 ? "а" : "и"})
                      </span>
                    )}
                  </p>
                  {group.description && (
                    <p className="text-xs text-ink-soft">{group.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    value={group.parent_id ?? ""}
                    onChange={(e) => changeParent(group.id, e.target.value || null)}
                    disabled={pending}
                    className="!h-9 !min-h-9 !w-auto !min-w-[9.5rem] !rounded-lg !px-3 !py-0 text-xs leading-none"
                  >
                    <option value="">Главна група</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.name}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => remove(group.id, group.name)}
                    disabled={pending}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                    aria-label={`Изтрий ${group.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function groupSegmentCount(
  groupId: string,
  groups: SegmentGroup[],
  segmentCountByGroup: Map<string | null, number>,
): number {
  const ids = [groupId, ...getDescendantGroupIds(groupId, groups)];
  return ids.reduce((sum, id) => sum + (segmentCountByGroup.get(id) ?? 0), 0);
}

export { getSegmentKeysForGroup };
