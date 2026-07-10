"use client";

import { useMemo, useState, useTransition, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Download, Upload, Trash2, Tag, UserMinus, UserCheck, X, ChevronDown, ChevronUp, BarChart3, Loader2 } from "lucide-react";
import type { Subscriber, Segment, SegmentGroup } from "@/lib/supabase/types";
import type { EmailEngagementSummary, EngagementActivityItem, ClickEventItem } from "@/lib/admin/engagement";
import type {
  ContactSummary,
  PersonFormSubmission,
  PersonPurchase,
  PersonZoomSession,
} from "@/lib/admin/person-profile";
import {
  SegmentAssignChecklist,
  assignableSegments,
  mergeTags,
  parseTagList,
} from "@/components/admin/segment-checklist";
import { getSegmentKeysForGroup } from "@/lib/segments/hierarchy";
import {
  addSubscriber,
  updateSubscriber,
  deleteSubscriber,
  importSubscribers,
  getSubscriberEngagementReport,
} from "@/app/(admin)/admin/actions";
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
import { formatDate } from "@/lib/utils";
import {
  applyHealthSelectionToTags,
  healthInterestLabelsFromTags,
  healthSelectionFromTags,
  HEALTH_SEGMENT_LABELS_BG,
  type HealthSelection,
} from "@/lib/site/health-tags";

export function SubscribersManager({
  subscribers,
  segments,
  groups,
  subscriberTags = [],
  engagementByEmail = {},
  contactByEmail = {},
}: {
  subscribers: Subscriber[];
  segments: Segment[];
  groups: SegmentGroup[];
  subscriberTags?: string[];
  engagementByEmail?: Record<string, EmailEngagementSummary>;
  contactByEmail?: Record<string, ContactSummary>;
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
  const [editHealth, setEditHealth] = useState<HealthSelection>({
    insulinResistance: false,
    diabetes: false,
    general: false,
  });

  const [importSegments, setImportSegments] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportSubscriberRow[] | null>(
    null,
  );
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [statsEmail, setStatsEmail] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDetail, setStatsDetail] = useState<{
    summary: EmailEngagementSummary;
    activity: EngagementActivityItem[];
    clickEvents: ClickEventItem[];
    profile: {
      contact: ContactSummary;
      purchases: PersonPurchase[];
      formSubmissions: PersonFormSubmission[];
      zoomSessions: PersonZoomSession[];
    };
  } | null>(null);

  const filtered = useMemo(() => {
    let expandedTags: string[] | null = null;
    if (tagFilter.startsWith("group:")) {
      expandedTags = getSegmentKeysForGroup(
        tagFilter.slice("group:".length),
        groups,
        segments,
      );
    } else if (tagFilter !== "all") {
      expandedTags = [tagFilter];
    }
    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (expandedTags && !s.tags.some((t) => expandedTags!.includes(t))) return false;
      if (search && !s.email.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [subscribers, statusFilter, tagFilter, search, segments, groups]);

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
    setEditHealth(healthSelectionFromTags(s.tags));
    setEditTagKeys(s.tags.filter((t) => known.has(t)));
    setEditExtraTags(s.tags.filter((t) => !known.has(t)).join(", "));
  }

  function saveEditSegments() {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateSubscriber({
        id: editing.id,
        tags: applyHealthSelectionToTags(
          mergeTags(editTagKeys, parseTagList(editExtraTags)),
          editHealth,
        ),
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

  async function toggleStats(email: string) {
    if (statsEmail === email) {
      setStatsEmail(null);
      setStatsDetail(null);
      return;
    }
    setStatsEmail(email);
    setStatsLoading(true);
    setStatsDetail(null);
    const res = await getSubscriberEngagementReport(email);
    setStatsLoading(false);
    if (res.ok) {
      setStatsDetail({
        summary: res.summary,
        activity: res.activity,
        clickEvents: res.clickEvents,
        profile: res.profile,
      });
    }
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
            <SegmentAssignChecklist
              segments={segments}
              groups={groups}
              selected={add.tagKeys}
              onChange={(tagKeys) => setAdd({ ...add, tagKeys })}
              disabled={pending}
            />
          </Field>

          {customTagOptions.length > 0 && (
            <Field label="Existing tags" hint="Tags already used on other subscribers.">
              <div className="flex flex-wrap gap-2">
                {customTagOptions.map((tag) => {
                  const active = add.tagKeys.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setAdd({
                          ...add,
                          tagKeys: active
                            ? add.tagKeys.filter((k) => k !== tag)
                            : [...add.tagKeys, tag],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        active
                          ? "border-coral-400 bg-coral-500/10 text-coral-600"
                          : "border-ink/15 text-ink-soft"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
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
          <SegmentAssignChecklist
            segments={segments}
            groups={groups}
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
        <Card title={`Сегменти и интерес — ${editing.email}`}>
          <div className="rounded-xl border border-forest-100 bg-cream/40 p-4">
            <p className="text-sm font-semibold text-slate-800">Какво го вълнува?</p>
            <p className="mt-1 text-xs text-ink-soft">
              Същото като при записване от сайта — инсулинова резистентност, диабет или
              общо отслабване.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {(
                [
                  ["insulinResistance", HEALTH_SEGMENT_LABELS_BG["insulin-resistance"]],
                  ["diabetes", HEALTH_SEGMENT_LABELS_BG.diabetes],
                  ["general", HEALTH_SEGMENT_LABELS_BG["weight-loss"]],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editHealth[key]}
                    onChange={(e) =>
                      setEditHealth({ ...editHealth, [key]: e.target.checked })
                    }
                    disabled={pending}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
          <Field label="Други сегменти">
            <SegmentAssignChecklist
              segments={segments}
              groups={groups}
              selected={editTagKeys}
              onChange={setEditTagKeys}
              disabled={pending}
            />
          </Field>
          </div>

          {customTagOptions.length > 0 && (
            <div className="mt-4">
              <Field label="Existing tags">
                <div className="flex flex-wrap gap-2">
                  {customTagOptions.map((tag) => {
                    const active = editTagKeys.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditTagKeys(
                            active
                              ? editTagKeys.filter((k) => k !== tag)
                              : [...editTagKeys, tag],
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          active
                            ? "border-coral-400 bg-coral-500/10 text-coral-600"
                            : "border-ink/15 text-ink-soft"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
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
          <Field label="Filter">
            <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
              <option value="all">Всички</option>
              {groups.map((group) => (
                <option key={group.id} value={`group:${group.id}`}>
                  Група: {group.name}
                </option>
              ))}
              {assignableSegments(segments).map((segment) => (
                <option key={segment.key} value={segment.key}>
                  Сегмент: {segment.name}
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
                <th className="py-2 pr-4">Интерес</th>
                <th className="py-2 pr-4">Сегменти</th>
                <th className="py-2 pr-4">Плащане</th>
                <th className="py-2 pr-4">Zoom</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-center">Отворени</th>
                <th className="py-2 pr-4 text-center">Кликове</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const stats = engagementByEmail[s.email.toLowerCase()];
                const contact = contactByEmail[s.email.toLowerCase()];
                const isStatsOpen = statsEmail === s.email;
                return (
                  <Fragment key={s.id}>
                    <tr className="border-b border-ink/5">
                      <td className="py-3 pr-4 font-medium">{s.email}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || "—"}
                        {s.facebook_url ? (
                          <a
                            href={s.facebook_url.startsWith("http") ? s.facebook_url : `https://${s.facebook_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 block truncate text-xs text-brand-600 hover:underline"
                          >
                            Facebook
                          </a>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{s.phone || "—"}</td>
                      <td className="py-3 pr-4 uppercase text-ink-soft">{s.locale}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {healthInterestLabelsFromTags(s.tags).length === 0 ? (
                            <span className="text-ink-soft/50">—</span>
                          ) : (
                            healthInterestLabelsFromTags(s.tags).map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-gold-400/20 px-2 py-0.5 text-xs text-amber-900"
                              >
                                {label}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
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
                      <td className="py-3 pr-4">
                        {contact?.paymentStatus === "paid" ? (
                          <span className="rounded-full bg-forest-500/15 px-2.5 py-1 text-xs font-medium text-forest-700">
                            Платил
                          </span>
                        ) : contact?.paymentStatus === "unpaid" ? (
                          <span className="rounded-full bg-gold-400/20 px-2.5 py-1 text-xs text-amber-900">
                            Неплатил
                          </span>
                        ) : (
                          <span className="text-ink-soft/50">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {contact?.zoomAttended ? (
                          <span title="Общо време в Zoom">
                            {contact.zoomTotalMinutes} мин.
                          </span>
                        ) : (
                          "—"
                        )}
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
                      <td className="py-3 pr-4 text-center text-ink-soft">
                        {stats?.emailsOpened ?? 0}
                        {stats && stats.emailsSent > 0 && (
                          <span className="block text-[10px] text-ink-soft/60">
                            / {stats.emailsSent}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-center font-medium text-forest-700">
                        {stats?.totalClicks ?? 0}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleStats(s.email)}
                            title="Пълен профил и статистика"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-forest-500/10 hover:text-forest-700"
                          >
                            {isStatsOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <BarChart3 className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditSegments(s)}
                            title="Сегменти и интерес"
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
                    {isStatsOpen && (
                      <tr className="border-b border-ink/5 bg-cream-2/30">
                        <td colSpan={12} className="px-4 py-4">
                          {statsLoading ? (
                            <p className="flex items-center gap-2 text-sm text-ink-soft">
                              <Loader2 className="h-4 w-4 animate-spin" /> Зареждане…
                            </p>
                          ) : statsDetail ? (
                            <div className="space-y-6">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-display text-base font-semibold text-ink">
                                    Профил: {s.email}
                                  </p>
                                  {statsDetail.profile.contact.contactId && (
                                    <Link
                                      href={`/admin/contacts/${statsDetail.profile.contact.contactId}`}
                                      className="mt-1 inline-block text-xs font-medium text-forest-700 hover:underline"
                                    >
                                      Отвори journey в Контакти →
                                    </Link>
                                  )}
                                </div>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    statsDetail.summary.tier === "hot"
                                      ? "bg-coral-500/15 text-coral-700"
                                      : statsDetail.summary.tier === "warm"
                                        ? "bg-gold-400/25 text-amber-900"
                                        : statsDetail.summary.tier === "cold"
                                          ? "bg-sky-100 text-sky-800"
                                          : "bg-ink/5 text-ink-soft"
                                  }`}
                                >
                                  {statsDetail.summary.tier === "hot"
                                    ? "Горещ лийд"
                                    : statsDetail.summary.tier === "warm"
                                      ? "Топъл"
                                      : statsDetail.summary.tier === "cold"
                                        ? "Студен"
                                        : "Без активност"}
                                </span>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-ink/10 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                                    Имейли
                                  </p>
                                  <p className="mt-2 text-sm">
                                    <strong>{statsDetail.summary.emailsOpened}</strong>/
                                    {statsDetail.summary.emailsSent} отворени (
                                    {statsDetail.summary.openRate}%)
                                  </p>
                                  <p className="mt-1 text-xs text-ink-soft">
                                    {statsDetail.summary.totalClicks} клика на бутони
                                  </p>
                                </div>
                                <div className="rounded-xl border border-ink/10 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                                    Плащане
                                  </p>
                                  <p className="mt-2 text-sm font-medium">
                                    {statsDetail.profile.contact.paymentStatus === "paid"
                                      ? "Платил"
                                      : statsDetail.profile.contact.paymentStatus === "unpaid"
                                        ? "Неплатил"
                                        : "Няма contact запис"}
                                  </p>
                                  {statsDetail.profile.contact.paidAt && (
                                    <p className="mt-1 text-xs text-ink-soft">
                                      {formatDate(statsDetail.profile.contact.paidAt, "bg")}
                                    </p>
                                  )}
                                </div>
                                <div className="rounded-xl border border-ink/10 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                                    Zoom
                                  </p>
                                  <p className="mt-2 text-sm font-medium">
                                    {statsDetail.profile.contact.zoomAttended
                                      ? `${statsDetail.profile.contact.zoomTotalMinutes} мин. общо`
                                      : "Не е участвал"}
                                  </p>
                                  {statsDetail.profile.contact.zoomLastJoinedAt && (
                                    <p className="mt-1 text-xs text-ink-soft">
                                      Последно:{" "}
                                      {formatDate(
                                        statsDetail.profile.contact.zoomLastJoinedAt,
                                        "bg",
                                      )}
                                    </p>
                                  )}
                                </div>
                                <div className="rounded-xl border border-ink/10 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                                    Покупки
                                  </p>
                                  <p className="mt-2 text-sm font-medium">
                                    {statsDetail.profile.purchases.length > 0
                                      ? `${statsDetail.profile.purchases.length} продукт(а)`
                                      : "Няма"}
                                  </p>
                                </div>
                              </div>

                              {statsDetail.profile.zoomSessions.length > 0 && (
                                <div>
                                  <p className="mb-2 text-sm font-semibold">Zoom сесии</p>
                                  <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                                          <th className="px-3 py-2">Влязъл</th>
                                          <th className="px-3 py-2">Излязъл</th>
                                          <th className="px-3 py-2">Време</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {statsDetail.profile.zoomSessions.map((session, i) => (
                                          <tr
                                            key={`${session.leftAt}-${i}`}
                                            className="border-b border-ink/5 last:border-0"
                                          >
                                            <td className="px-3 py-2 text-xs text-ink-soft">
                                              {session.joinedAt
                                                ? formatDate(session.joinedAt, "bg")
                                                : "—"}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-ink-soft">
                                              {formatDate(session.leftAt, "bg")}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-forest-700">
                                              {session.durationMinutes} мин.
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {statsDetail.profile.purchases.length > 0 && (
                                <div>
                                  <p className="mb-2 text-sm font-semibold">Покупки</p>
                                  <ul className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
                                    {statsDetail.profile.purchases.map((purchase) => (
                                      <li
                                        key={`${purchase.productTitle}-${purchase.purchasedAt}`}
                                        className="flex flex-wrap justify-between gap-2 text-sm"
                                      >
                                        <span className="font-medium">
                                          {purchase.productTitle}
                                        </span>
                                        <span className="text-xs text-ink-soft">
                                          {formatDate(purchase.purchasedAt, "bg")}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {statsDetail.profile.formSubmissions.length > 0 && (
                                <div>
                                  <p className="mb-2 text-sm font-semibold">
                                    Отговори от форми
                                  </p>
                                  <div className="space-y-3">
                                    {statsDetail.profile.formSubmissions.map((form) => (
                                      <div
                                        key={`${form.formName}-${form.submittedAt}`}
                                        className="rounded-xl border border-ink/10 bg-white p-4"
                                      >
                                        <div className="flex flex-wrap justify-between gap-2">
                                          <p className="text-sm font-semibold">
                                            {form.formName}
                                          </p>
                                          <p className="text-xs text-ink-soft">
                                            {formatDate(form.submittedAt, "bg")}
                                          </p>
                                        </div>
                                        <ul className="mt-2 space-y-1 text-xs">
                                          {form.rows.map((row) => (
                                            <li key={`${form.formName}-${row.label}`}>
                                              <span className="font-medium text-slate-700">
                                                {row.label}:
                                              </span>{" "}
                                              <span className="text-ink-soft">
                                                {row.value}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {statsDetail.activity.length > 0 && (
                                <div>
                                  <p className="mb-2 text-sm font-semibold">Имейл активност</p>
                                  <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                                          <th className="px-3 py-2">Имейл</th>
                                          <th className="px-3 py-2">Тип</th>
                                          <th className="px-3 py-2">Изпратен</th>
                                          <th className="px-3 py-2">Отворен</th>
                                          <th className="px-3 py-2">Кликове</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {statsDetail.activity.map((item, i) => (
                                          <tr
                                            key={`${item.title}-${item.sentAt}-${i}`}
                                            className="border-b border-ink/5 last:border-0"
                                          >
                                            <td className="px-3 py-2 font-medium">
                                              {item.title}
                                            </td>
                                            <td className="px-3 py-2 text-ink-soft">
                                              {item.kind === "campaign"
                                                ? "Кампания"
                                                : "Автоматизация"}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-ink-soft">
                                              {formatDate(item.sentAt, "bg")}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-ink-soft">
                                              {item.opened
                                                ? item.openedAt
                                                  ? formatDate(item.openedAt, "bg")
                                                  : "Да"
                                                : "—"}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-forest-700">
                                              {item.clicks}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {statsDetail.clickEvents.length > 0 && (
                                <div>
                                  <p className="mb-2 text-sm font-semibold">
                                    Кликове по линкове
                                  </p>
                                  <ul className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
                                    {statsDetail.clickEvents.map((click, i) => (
                                      <li
                                        key={`${click.clickedAt}-${i}`}
                                        className="text-xs text-ink-soft"
                                      >
                                        <span className="font-medium text-slate-700">
                                          {click.linkLabel || click.targetUrl || "Линк"}
                                        </span>
                                        {" · "}
                                        {click.sourceTitle} ·{" "}
                                        {formatDate(click.clickedAt, "bg")}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {statsDetail.activity.length === 0 &&
                                statsDetail.profile.zoomSessions.length === 0 &&
                                statsDetail.profile.purchases.length === 0 &&
                                statsDetail.profile.formSubmissions.length === 0 && (
                                  <p className="text-sm text-ink-soft">
                                    Още няма записана активност за този имейл.
                                  </p>
                                )}
                            </div>
                          ) : (
                            <p className="text-sm text-ink-soft">Няма данни.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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
