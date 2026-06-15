"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Trash2, Tag, UserMinus, UserCheck } from "lucide-react";
import type { Subscriber, Segment } from "@/lib/supabase/types";
import {
  addSubscriber,
  updateSubscriber,
  deleteSubscriber,
} from "@/app/(admin)/admin/actions";
import { Field, Input, Select, Card } from "@/components/admin/fields";

export function SubscribersManager({
  subscribers,
  segments,
}: {
  subscribers: Subscriber[];
  segments: Segment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [add, setAdd] = useState({
    email: "",
    name: "",
    phone: "",
    locale: "bg" as "bg" | "en",
    tags: "",
  });

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (tagFilter !== "all" && !s.tags.includes(tagFilter)) return false;
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [subscribers, statusFilter, tagFilter, search]);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addSubscriber(add);
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setAdd({ email: "", name: "", phone: "", locale: "bg", tags: "" });
      router.refresh();
    });
  }

  function exportCsv() {
    const header = ["email", "name", "phone", "locale", "status", "tags", "source", "created_at"];
    const rows = filtered.map((s) =>
      [
        s.email,
        s.name ?? "",
        s.phone ?? "",
        s.locale,
        s.status,
        s.tags.join("|"),
        s.source,
        s.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function editTags(s: Subscriber) {
    const next = prompt("Tags (comma separated):", s.tags.join(", "));
    if (next === null) return;
    startTransition(async () => {
      await updateSubscriber({ id: s.id, tags: next });
      router.refresh();
    });
  }

  function toggleStatus(s: Subscriber) {
    startTransition(async () => {
      await updateSubscriber({
        id: s.id,
        status: s.status === "subscribed" ? "unsubscribed" : "subscribed",
      });
      router.refresh();
    });
  }

  function remove(s: Subscriber) {
    if (!confirm(`Delete ${s.email}?`)) return;
    startTransition(async () => {
      await deleteSubscriber(s.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Add subscriber manually">
        <form onSubmit={submitAdd} className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <Field label="Email">
              <Input
                type="email"
                required
                value={add.email}
                onChange={(e) => setAdd({ ...add, email: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Name">
            <Input
              value={add.name}
              onChange={(e) => setAdd({ ...add, name: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={add.phone}
              onChange={(e) => setAdd({ ...add, phone: e.target.value })}
              placeholder="+359..."
            />
          </Field>
          <Field label="Language">
            <Select
              value={add.locale}
              onChange={(e) => setAdd({ ...add, locale: e.target.value as "bg" | "en" })}
            >
              <option value="bg">BG</option>
              <option value="en">EN</option>
            </Select>
          </Field>
          <div className="md:col-span-4">
            <Field label="Tags / segments" hint="Comma separated">
              <Input
                value={add.tags}
                onChange={(e) => setAdd({ ...add, tags: e.target.value })}
                placeholder="weight-loss, insulin-resistance"
              />
            </Field>
          </div>
          <div className="flex items-end">
            <button
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-coral-500 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-coral-600">{error}</p>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Segment">
            <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">All segments</option>
              {segments.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </Select>
          </Field>
          <Field label="Search email">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <div className="ml-auto flex items-end gap-3">
            <span className="pb-2.5 text-sm text-ink-soft">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={exportCsv}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Lang</th>
                <th className="py-2 pr-4">Tags</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-ink/5 last:border-0">
                  <td className="py-3 pr-4 font-medium">{s.email}</td>
                  <td className="py-3 pr-4 text-ink-soft">{s.name || "—"}</td>
                  <td className="py-3 pr-4 uppercase text-ink-soft">{s.locale}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {s.tags.length === 0 ? (
                        <span className="text-ink-soft/50">—</span>
                      ) : (
                        s.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-forest-50 px-2 py-0.5 text-xs text-forest-600"
                          >
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{s.source}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        s.status === "subscribed"
                          ? "rounded-full bg-forest-500/15 px-2.5 py-1 text-xs text-forest-600"
                          : "rounded-full bg-ink/10 px-2.5 py-1 text-xs text-ink-soft"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => editTags(s)}
                        title="Edit tags"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(s)}
                        title="Toggle status"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
                      >
                        {s.status === "subscribed" ? (
                          <UserMinus className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => remove(s)}
                        title="Delete"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-soft">
              No subscribers match these filters.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
