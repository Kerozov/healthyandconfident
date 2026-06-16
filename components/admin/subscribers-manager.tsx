"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Upload, Trash2, Tag, UserMinus, UserCheck, X } from "lucide-react";
import type { Subscriber, Segment } from "@/lib/supabase/types";
import {
  addSubscriber,
  updateSubscriber,
  deleteSubscriber,
  importSubscribers,
} from "@/app/(admin)/admin/actions";
import { SegmentChecklist, assignableSegments, mergeTags, parseTagList } from "@/components/admin/segment-checklist";
import { Field, Input, Select, Card } from "@/components/admin/fields";
import {
  exportSubscribersCsv,
  exportSubscribersExcel,
} from "@/lib/admin/export-subscribers";
import {
  downloadImportTemplate,
  parseSubscriberFile,
  type ImportSubscriberRow,
} from "@/lib/admin/import-subscribers";

export function SubscribersManager({
  subscribers,
  segments,
  subscriberTags = [],
}: {
  subscribers: Subscriber[];
  segments: Segment[];
  subscriberTags?: string[];
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
    tagKeys: [] as string[],
    extraTags: "",
  });

  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [editTagKeys, setEditTagKeys] = useState<string[]>([]);
  const [editExtraTags, setEditExtraTags] = useState("");

  const [importSegments, setImportSegments] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportSubscriberRow[] | null>(
    null,
  );
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importNote, setImportNote] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (tagFilter !== "all" && !s.tags.includes(tagFilter)) return false;
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [subscribers, statusFilter, tagFilter, search]);

  const segmentKeySet = useMemo(
    () => new Set(assignableSegments(segments).map((s) => s.key)),
    [segments],
  );

  const customTagOptions = useMemo(() => {
    const fromSubs = subscriberTags.filter((t) => !segmentKeySet.has(t) && t !== "all");
    return [...new Set(fromSubs)].sort();
  }, [subscriberTags, segmentKeySet]);

  const segmentNameByKey = useMemo(() => {
    const map = new Map(segments.map((s) => [s.key, s.name]));
    return (key: string) => map.get(key) ?? key;
  }, [segments]);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addSubscriber({
        email: add.email,
        name: add.name || undefined,
        phone: add.phone || undefined,
        locale: add.locale,
        tags: mergeTags(add.tagKeys, parseTagList(add.extraTags)),
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setAdd({
        email: "",
        name: "",
        phone: "",
        locale: "bg",
        tagKeys: [],
        extraTags: "",
      });
      router.refresh();
    });
  }

  function openEditSegments(s: Subscriber) {
    setEditing(s);
    const known = new Set([...segmentKeySet, ...customTagOptions]);
    setEditTagKeys(s.tags.filter((t) => known.has(t)));
    setEditExtraTags(s.tags.filter((t) => !known.has(t)).join(", "));
  }

  function saveEditSegments() {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateSubscriber({
        id: editing.id,
        tags: mergeTags(editTagKeys, parseTagList(editExtraTags)),
      });
      if (!res.ok) {
        setError(res.message || "Failed to update segments");
        return;
      }
      setEditing(null);
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

  async function handleImportFile(file: File | null) {
    setImportNote(null);
    setImportPreview(null);
    setImportSkipped([]);
    if (!file) return;

    try {
      const parsed = await parseSubscriberFile(file, segments, importSegments);
      setImportPreview(parsed.rows);
      setImportSkipped(parsed.skipped);
      if (parsed.rows.length === 0) {
        setImportNote(
          parsed.skipped.length
            ? "No valid rows found. Check the file format."
            : "The file is empty.",
        );
      }
    } catch (err) {
      setImportNote(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  function runImport() {
    if (!importPreview?.length) return;
    setImportNote(null);
    startTransition(async () => {
      const res = await importSubscribers({
        rows: importPreview,
        mergeSegments: true,
      });
      setImportNote(res.message ?? (res.ok ? "Done." : "Import failed."));
      if (res.ok) {
        setImportPreview(null);
        setImportSkipped([]);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card title="Add subscriber manually">
        <form onSubmit={submitAdd} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
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
                placeholder="0888… or +359…"
              />
            </Field>
            <Field label="Language">
              <Select
                value={add.locale}
                onChange={(e) =>
                  setAdd({ ...add, locale: e.target.value as "bg" | "en" })
                }
              >
                <option value="bg">BG</option>
                <option value="en">EN</option>
              </Select>
            </Field>
          </div>

          <Field label="Segments" hint="Tick one or more segments.">
            <SegmentChecklist
              segments={segments}
              selected={add.tagKeys}
              onChange={(tagKeys) => setAdd({ ...add, tagKeys })}
              disabled={pending}
            />
          </Field>

          {customTagOptions.length > 0 && (
            <Field label="Existing tags" hint="Tags already used on other subscribers.">
              <SegmentChecklist
                segments={customTagOptions.map((key) => ({
                  id: key,
                  key,
                  name: key,
                  description: null,
                  created_at: "",
                }))}
                selected={add.tagKeys}
                onChange={(tagKeys) => setAdd({ ...add, tagKeys })}
              disabled={pending}
              />
            </Field>
          )}

          <Field
            label="Additional tags"
            hint="Comma-separated — custom tags not in the list above."
          >
            <Input
              value={add.extraTags}
              onChange={(e) => setAdd({ ...add, extraTags: e.target.value })}
              placeholder="vip, webinar-2026"
            />
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Add subscriber
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-coral-600">{error}</p>}
      </Card>

      <Card title="Import from Excel / CSV">
        <p className="mb-4 text-sm text-ink-soft">
          Upload <code className="text-xs">.xlsx</code> or <code className="text-xs">.csv</code>.
          Required column: <strong>email</strong>. Optional: name, phone, locale, status,
          segments (comma-separated keys or names).
        </p>

        <Field
          label="Default segments"
          hint="Applied when a row has no segments column or it is empty."
        >
          <SegmentChecklist
            segments={segments}
            selected={importSegments}
            onChange={setImportSegments}
            disabled={pending}
          />
        </Field>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5">
            <Upload className="h-4 w-4" />
            Choose file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={downloadImportTemplate}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
          >
            <Download className="h-4 w-4" /> Download template
          </button>
          {importPreview && importPreview.length > 0 && (
            <button
              type="button"
              onClick={runImport}
              disabled={pending}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              Import {importPreview.length} row{importPreview.length === 1 ? "" : "s"}
            </button>
          )}
        </div>

        {importPreview && importPreview.length > 0 && (
          <p className="mt-3 text-sm text-forest-600">
            Ready: {importPreview.length} subscriber
            {importPreview.length === 1 ? "" : "s"}
            {importSkipped.length > 0 &&
              ` · ${importSkipped.length} row(s) skipped`}
          </p>
        )}
        {importSkipped.length > 0 && (
          <ul className="mt-2 text-xs text-coral-600">
            {importSkipped.slice(0, 5).map((s) => (
              <li key={`${s.line}-${s.reason}`}>
                Row {s.line}: {s.reason}
              </li>
            ))}
            {importSkipped.length > 5 && (
              <li>…and {importSkipped.length - 5} more</li>
            )}
          </ul>
        )}
        {importNote && (
          <p
            className={`mt-3 text-sm ${importNote.includes("failed") || importNote.includes("No valid") ? "text-coral-600" : "text-forest-600"}`}
          >
            {importNote}
          </p>
        )}
      </Card>

      {editing && (
        <Card title={`Tags — ${editing.email}`}>
          <Field label="Segments">
            <SegmentChecklist
              segments={segments}
              selected={editTagKeys}
              onChange={setEditTagKeys}
              disabled={pending}
            />
          </Field>

          {customTagOptions.length > 0 && (
            <div className="mt-4">
              <Field label="Existing tags">
                <SegmentChecklist
                  segments={customTagOptions.map((key) => ({
                    id: key,
                    key,
                    name: key,
                    description: null,
                    created_at: "",
                  }))}
                  selected={editTagKeys}
                  onChange={setEditTagKeys}
                  disabled={pending}
                />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <Field label="Additional tags" hint="Comma-separated.">
              <Input
                value={editExtraTags}
                onChange={(e) => setEditExtraTags(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={saveEditSegments}
              disabled={pending}
              className="inline-flex h-10 items-center rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              Save tags
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={pending}
              className="inline-flex h-10 items-center gap-1 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </Card>
      )}

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
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <span className="pb-2.5 text-sm text-ink-soft">
              {filtered.length} result{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => exportSubscribersExcel(filtered)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button
              onClick={() => exportSubscribersCsv(filtered)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Lang</th>
                <th className="py-2 pr-4">Segments</th>
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
                  <td className="py-3 pr-4 text-ink-soft">{s.phone || "—"}</td>
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
                            {segmentNameByKey(t)}
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
                        onClick={() => openEditSegments(s)}
                        title="Edit segments"
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
