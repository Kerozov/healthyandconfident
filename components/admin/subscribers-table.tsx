"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { ContactStatus, Segment, SegmentGroup, Subscriber } from "@/lib/supabase/types";
import { assignableSegments } from "@/components/admin/segment-checklist";
import { getSegmentKeysForGroup } from "@/lib/segments/hierarchy";
import { deleteSubscriber } from "@/app/(admin)/admin/actions";
import { exportSubscribersCsv, exportSubscribersExcel } from "@/lib/admin/export-subscribers";
import {
  CONTACTS_LIST_URL_KEY,
  formatShortDate,
  groupChipsForTags,
  personDisplayName,
  personInitials,
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABELS,
  sourceCategory,
  sourceLabel,
  type SourceCategory,
} from "@/lib/admin/contact-crm";
import { StatusBadge } from "@/components/admin/contact-status-badge";
import { ContactStatusDialog } from "@/components/admin/contact-status-dialog";
import { SubscriberEditDialog } from "@/components/admin/subscriber-edit-dialog";
import { AdminNavLink } from "@/components/admin/admin-navigation";
import { Alert } from "@/components/admin/ui";
import { chunkArray, cn } from "@/lib/utils";

export type SubscribersTableQuery = {
  q?: string;
  group?: string;
  status?: string;
  source?: string;
  sub?: string;
  sort?: string;
  dir?: string;
  page?: string;
  size?: string;
};

type SortKey = "created" | "name" | "status" | "changed" | "source" | "groups";
const SORT_KEYS: SortKey[] = ["created", "name", "status", "changed", "source", "groups"];
const PAGE_SIZES = [25, 50, 100] as const;
const DELETE_CLIENT_BATCH = 40;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = active === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn("px-3 py-3 font-semibold", className)}
      aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 uppercase tracking-wider transition-colors hover:text-ink",
          isActive && "text-ink",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !isActive && "opacity-40")} aria-hidden />
      </button>
    </th>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink outline-none transition-colors focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20",
          value && value !== "all" ? "border-forest-400 bg-forest-50/60" : "border-ink/15",
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function SubscribersTable({
  subscribers,
  segments,
  groups,
  statuses,
  statusesAvailable,
  subscriberTags = [],
  formNames = {},
  initialQuery = {},
}: {
  subscribers: Subscriber[];
  segments: Segment[];
  groups: SegmentGroup[];
  statuses: ContactStatus[];
  statusesAvailable: boolean;
  subscriberTags?: string[];
  formNames?: Record<string, string>;
  initialQuery?: SubscribersTableQuery;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialQuery.q ?? "");
  const [groupFilter, setGroupFilter] = useState(initialQuery.group ?? "all");
  const [statusFilter, setStatusFilter] = useState(initialQuery.status ?? "all");
  const [sourceFilter, setSourceFilter] = useState(initialQuery.source ?? "all");
  const [subFilter, setSubFilter] = useState(initialQuery.sub ?? "all");
  const [sort, setSort] = useState<SortKey>(
    SORT_KEYS.includes(initialQuery.sort as SortKey) ? (initialQuery.sort as SortKey) : "created",
  );
  const [dir, setDir] = useState<"asc" | "desc">(initialQuery.dir === "asc" ? "asc" : "desc");
  const [pageSize, setPageSize] = useState<number>(() => {
    const n = Number(initialQuery.size);
    return (PAGE_SIZES as readonly number[]).includes(n) ? n : 50;
  });
  const [page, setPage] = useState(() => Math.max(1, Number(initialQuery.page) || 1));

  // Fixed once per mount: "the last 7 days" must not shift between renders.
  const [loadedAt] = useState(() => Date.now());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [statusDialog, setStatusDialog] = useState<{
    ids: string[];
    title: string;
    subtitle?: string;
    current: string | null;
  } | null>(null);
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const statusOrder = useMemo(
    () => new Map(statuses.map((s, i) => [s.id, i])),
    [statuses],
  );
  const segmentKeySet = useMemo(
    () => new Set(assignableSegments(segments).map((s) => s.key)),
    [segments],
  );
  const customTagOptions = useMemo(
    () =>
      [...new Set(subscriberTags.filter((t) => !segmentKeySet.has(t) && t !== "all"))].sort(),
    [subscriberTags, segmentKeySet],
  );
  const sortedSegments = useMemo(
    () =>
      assignableSegments(segments)
        .filter((s) => s.key !== "all")
        .sort((a, b) => a.name.localeCompare(b.name, "bg")),
    [segments],
  );

  /** Per row, computed once: what the table shows and sorts by. */
  const rows = useMemo(
    () =>
      subscribers.map((s) => {
        const name = personDisplayName(s);
        const { chips } = groupChipsForTags(s.tags ?? [], segments, groups);
        return {
          s,
          name,
          chips,
          category: sourceCategory(s.source),
          source: sourceLabel(s.source, formNames),
          haystack: [s.email, name, s.phone ?? ""].join(" ").toLowerCase(),
        };
      }),
    [subscribers, segments, groups, formNames],
  );

  const exactSources = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const r of rows) {
      const key = r.s.source || "";
      const entry = counts.get(key) ?? { label: r.source, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [rows]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<SourceCategory, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return counts;
  }, [rows]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.s.crm_status_id ?? "none";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    let groupKeys: Set<string> | null = null;
    if (groupFilter.startsWith("segment:")) {
      groupKeys = new Set(
        getSegmentKeysForGroup(groupFilter.slice("segment:".length), groups, segments),
      );
    } else if (groupFilter.startsWith("tag:")) {
      groupKeys = new Set([groupFilter.slice("tag:".length)]);
    }
    const q = search.trim().toLowerCase();

    const list = rows.filter((r) => {
      if (subFilter !== "all" && r.s.status !== subFilter) return false;
      if (statusFilter === "none" && r.s.crm_status_id) return false;
      if (statusFilter !== "all" && statusFilter !== "none" && r.s.crm_status_id !== statusFilter) {
        return false;
      }
      if (sourceFilter.startsWith("cat:") && r.category !== sourceFilter.slice(4)) return false;
      if (sourceFilter.startsWith("src:") && (r.s.source || "") !== sourceFilter.slice(4)) {
        return false;
      }
      if (groupKeys && !(r.s.tags ?? []).some((t) => groupKeys!.has(t))) return false;
      if (q && !r.haystack.includes(q)) return false;
      return true;
    });

    const factor = dir === "asc" ? 1 : -1;
    const byCreated = (a: (typeof list)[number], b: (typeof list)[number]) =>
      a.s.created_at.localeCompare(b.s.created_at) || a.s.id.localeCompare(b.s.id);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "name":
          cmp = (a.name || a.s.email).localeCompare(b.name || b.s.email, "bg");
          break;
        case "status": {
          // People without a status always sink to the bottom.
          const ao = a.s.crm_status_id ? (statusOrder.get(a.s.crm_status_id) ?? 999) : null;
          const bo = b.s.crm_status_id ? (statusOrder.get(b.s.crm_status_id) ?? 999) : null;
          if (ao === null && bo === null) cmp = 0;
          else if (ao === null) return 1;
          else if (bo === null) return -1;
          else cmp = ao - bo;
          break;
        }
        case "changed": {
          const ac = a.s.crm_status_changed_at ?? "";
          const bc = b.s.crm_status_changed_at ?? "";
          if (!ac && !bc) cmp = 0;
          else if (!ac) return 1;
          else if (!bc) return -1;
          else cmp = ac.localeCompare(bc);
          break;
        }
        case "source":
          cmp = a.source.localeCompare(b.source, "bg");
          break;
        case "groups":
          cmp = a.chips.length - b.chips.length;
          break;
        case "created":
          cmp = byCreated(a, b);
          break;
      }
      return cmp * factor || byCreated(b, a);
    });
    return list;
  }, [rows, groupFilter, statusFilter, sourceFilter, subFilter, search, sort, dir, groups, segments, statusOrder]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filters live in the address bar, so "back" from a profile lands on the same view.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string, fallback: string) => {
      if (value && value !== fallback) params.set(key, value);
      else params.delete(key);
    };
    set("q", search.trim(), "");
    set("group", groupFilter, "all");
    set("status", statusFilter, "all");
    set("source", sourceFilter, "all");
    set("sub", subFilter, "all");
    set("sort", sort, "created");
    set("dir", dir, "desc");
    set("page", String(currentPage), "1");
    set("size", String(pageSize), "50");
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
    try {
      window.sessionStorage.setItem(CONTACTS_LIST_URL_KEY, url);
    } catch {
      // Private mode — the back link then just opens the plain list.
    }
  }, [search, groupFilter, statusFilter, sourceFilter, subFilter, sort, dir, currentPage, pageSize]);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(key);
      setDir(key === "name" || key === "source" || key === "status" ? "asc" : "desc");
    }
    setPage(1);
  }

  const filtersActive =
    search.trim() !== "" ||
    groupFilter !== "all" ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    subFilter !== "all";

  function clearFilters() {
    setSearch("");
    setGroupFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setSubFilter("all");
    setPage(1);
  }

  // ── Selection ─────────────────────────────────────────────
  const selectedInView = filtered.filter((r) => selectedIds.has(r.s.id)).map((r) => r.s);
  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.s.id));
  const pageSomeSelected = pageRows.some((r) => selectedIds.has(r.s.id)) && !pageAllSelected;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (pageAllSelected) next.delete(r.s.id);
        else next.add(r.s.id);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.map((r) => r.s.id)));
  }

  // ── Row actions ───────────────────────────────────────────
  function remove(s: Subscriber) {
    if (!confirm(`Изтриване на ${s.email}? Това не може да се върне.`)) return;
    startTransition(async () => {
      const res = await deleteSubscriber(s.id);
      setNote(res.ok ? { ok: true, text: `${s.email} е изтрит.` } : { ok: false, text: res.message ?? "Не успях." });
      router.refresh();
    });
  }

  async function removeSelected() {
    const targets = selectedInView;
    if (targets.length === 0 || deleteProgress) return;
    const preview = targets.slice(0, 5).map((s) => s.email).join("\n");
    const more = targets.length > 5 ? `\n…и още ${targets.length - 5}` : "";
    if (!confirm(`Изтриване на ${targets.length} контакт(а)? Това не може да се върне.\n\n${preview}${more}`)) {
      return;
    }
    const ids = targets.map((s) => s.id);
    setNote(null);
    setDeleteProgress({ done: 0, total: ids.length });
    let deleted = 0;
    try {
      for (const batch of chunkArray(ids, DELETE_CLIENT_BATCH)) {
        const res = await fetch("/api/admin/subscribers/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: batch }),
        });
        let data: { ok?: boolean; deleted?: number; message?: string } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          data = {};
        }
        if (!res.ok || !data.ok) {
          const message =
            data.message ||
            (res.status === 401 || res.status === 403
              ? "Няма достъп / сесията е изтекла. Презареди и влез отново."
              : `Изтриването не успя (HTTP ${res.status})`);
          setNote({
            ok: false,
            text: deleted > 0 ? `${message} (изтрити ${deleted} от ${ids.length})` : message,
          });
          return;
        }
        deleted += data.deleted ?? batch.length;
        setDeleteProgress({ done: Math.min(deleted, ids.length), total: ids.length });
      }
      setNote({ ok: true, text: `Изтрити ${deleted} контакт(а).` });
      setSelectedIds(new Set());
    } catch (err) {
      setNote({ ok: false, text: err instanceof Error ? err.message : "Изтриването не успя." });
    } finally {
      setDeleteProgress(null);
      if (deleted > 0) router.refresh();
    }
  }

  const newThisWeek = rows.filter((r) => loadedAt - new Date(r.s.created_at).getTime() < WEEK_MS).length;
  const subscribedCount = rows.filter((r) => r.s.status === "subscribed").length;

  return (
    <div className="space-y-5">
      {/* Summary — every chip is also a one-click filter. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Контакти</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">
            {rows.length}
          </p>
          <p className="text-xs text-ink-soft">{subscribedCount} абонирани</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSort("created");
            setDir("desc");
            setPage(1);
          }}
          className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left transition-colors hover:border-forest-400"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Нови последните 7 дни
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-forest-700 [font-variant-numeric:tabular-nums]">
            +{newThisWeek}
          </p>
          <p className="text-xs text-ink-soft">най-новите са най-горе</p>
        </button>
        <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Откъде идват
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SOURCE_CATEGORIES.filter((c) => categoryCounts.get(c)).map((c) => {
              const active = sourceFilter === `cat:${c}`;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => resetPage(setSourceFilter)(active ? "all" : `cat:${c}`)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                    active ? "bg-forest-600 text-cream" : "bg-ink/5 text-ink-soft hover:bg-ink/10",
                  )}
                >
                  {SOURCE_CATEGORY_LABELS[c]}{" "}
                  <span className="[font-variant-numeric:tabular-nums] opacity-70">
                    {categoryCounts.get(c)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {statuses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Статуси:
          </span>
          {statuses.map((st) => {
            const active = statusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => resetPage(setStatusFilter)(active ? "all" : st.id)}
                className={cn(
                  "rounded-full transition",
                  active ? "ring-2 ring-ink/30 ring-offset-1" : "opacity-90 hover:opacity-100",
                )}
                aria-pressed={active}
              >
                <StatusBadge name={`${st.name} · ${statusCounts.get(st.id) ?? 0}`} color={st.color} />
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => resetPage(setStatusFilter)(statusFilter === "none" ? "all" : "none")}
            className={cn(
              "rounded-full border border-dashed px-2.5 py-0.5 text-xs text-ink-soft",
              statusFilter === "none" ? "border-ink/40 bg-cream" : "border-ink/20 hover:border-ink/35",
            )}
          >
            Без статус · {statusCounts.get("none") ?? 0}
          </button>
        </div>
      )}

      {!statusesAvailable && (
        <Alert variant="warning">
          Статусите още не са включени в базата (миграция 088). Колоните ще се попълнят след
          deploy.
        </Alert>
      )}

      <section className="rounded-2xl border border-ink/10 bg-white">
        <div className="space-y-3 border-b border-ink/10 p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
            <label className="block min-w-0 md:col-span-2 xl:col-span-1">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Търси
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => resetPage(setSearch)(e.target.value)}
                  placeholder="Имейл, име или телефон"
                  className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20"
                />
              </span>
            </label>
            <FilterSelect label="Група" value={groupFilter} onChange={resetPage(setGroupFilter)}>
              <option value="all">Всички групи</option>
              {groups.length > 0 && (
                <optgroup label="Сегменти (с всички групи в тях)">
                  {groups.map((g) => (
                    <option key={g.id} value={`segment:${g.id}`}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Групи">
                {sortedSegments.map((s) => (
                  <option key={s.key} value={`tag:${s.key}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
              {customTagOptions.length > 0 && (
                <optgroup label="Други етикети">
                  {customTagOptions.map((t) => (
                    <option key={t} value={`tag:${t}`}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              )}
            </FilterSelect>
            <FilterSelect label="Статус" value={statusFilter} onChange={resetPage(setStatusFilter)}>
              <option value="all">Всички статуси</option>
              <option value="none">Без статус</option>
              {statuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Откъде е" value={sourceFilter} onChange={resetPage(setSourceFilter)}>
              <option value="all">Всички източници</option>
              <optgroup label="Вид">
                {SOURCE_CATEGORIES.filter((c) => categoryCounts.get(c)).map((c) => (
                  <option key={c} value={`cat:${c}`}>
                    {SOURCE_CATEGORY_LABELS[c]} ({categoryCounts.get(c)})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Точно място">
                {exactSources.map(([key, entry]) => (
                  <option key={key || "-"} value={`src:${key}`}>
                    {entry.label} ({entry.count})
                  </option>
                ))}
              </optgroup>
            </FilterSelect>
            <FilterSelect label="Абонамент" value={subFilter} onChange={resetPage(setSubFilter)}>
              <option value="all">Всички</option>
              <option value="subscribed">Абонирани</option>
              <option value="unsubscribed">Отписани</option>
            </FilterSelect>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                {filtered.length}
              </span>{" "}
              {filtered.length === 1 ? "контакт" : "контакта"}
              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-coral-700 hover:bg-coral-500/10"
                >
                  <X className="h-3 w-3" /> Изчисти филтрите
                </button>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportSubscribersExcel(filtered.map((r) => r.s))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
              >
                <Download className="h-4 w-4" /> Excel
              </button>
              <button
                type="button"
                onClick={() => exportSubscribersCsv(filtered.map((r) => r.s))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          {selectedInView.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-forest-50 px-3 py-2.5">
              <span className="text-sm font-medium text-forest-800">
                Избрани: {selectedInView.length}
              </span>
              {selectedInView.length < filtered.length && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-forest-700 underline-offset-2 hover:underline"
                >
                  Избери всички {filtered.length}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-white"
              >
                Изчисти избора
              </button>
              <span className="flex-1" />
              {statuses.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setStatusDialog({
                      ids: selectedInView.map((s) => s.id),
                      title: `Статус за ${selectedInView.length} души`,
                      current: null,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-forest-600 px-4 text-sm font-semibold text-cream hover:bg-forest-700"
                >
                  Смени статуса
                </button>
              )}
              <button
                type="button"
                onClick={() => void removeSelected()}
                disabled={pending || deleteProgress !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-coral-300 px-4 text-sm font-semibold text-coral-700 hover:bg-coral-500/10 disabled:opacity-60"
              >
                {deleteProgress ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleteProgress
                  ? `Изтриване ${deleteProgress.done}/${deleteProgress.total}…`
                  : "Изтрий"}
              </button>
            </div>
          )}

          {note && (
            <p
              role="status"
              className={cn(
                "flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm",
                note.ok ? "bg-forest-50 text-forest-800" : "bg-coral-500/10 text-coral-800",
              )}
            >
              <span>{note.text}</span>
              <button type="button" onClick={() => setNote(null)} aria-label="Скрий">
                <X className="h-4 w-4 opacity-60" />
              </button>
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[12.5rem]" />
              <col className="w-[7.75rem]" />
              <col className="w-[6rem]" />
              <col className="w-[10rem]" />
              <col className="w-[10rem]" />
              <col className="w-[8.25rem]" />
              <col className="w-[5.75rem]" />
              <col className="w-[6rem]" />
            </colgroup>
            <thead className="border-b border-ink/10 bg-cream/50 text-[11px] text-ink-soft">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Избери всички на тази страница"
                    checked={pageAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = pageSomeSelected;
                    }}
                    onChange={togglePage}
                    disabled={pageRows.length === 0}
                    className="h-4 w-4 rounded border-ink/20"
                  />
                </th>
                <SortHeader label="Контакт" sortKey="name" active={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Статус" sortKey="status" active={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Сменен" sortKey="changed" active={sort} dir={dir} onSort={toggleSort} />
                <th className="px-3 py-3 font-semibold uppercase tracking-wider">Коментар</th>
                <SortHeader label="Групи" sortKey="groups" active={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Откъде" sortKey="source" active={sort} dir={dir} onSort={toggleSort} />
                <SortHeader label="Добавен" sortKey="created" active={sort} dir={dir} onSort={toggleSort} />
                <th className="px-3 py-3 text-right font-semibold uppercase tracking-wider">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(({ s, name, chips, category, source }) => {
                const status = s.crm_status_id ? statusById.get(s.crm_status_id) : undefined;
                const href = `/admin/subscribers/${s.id}`;
                const shown = chips.slice(0, 2);
                const hidden = chips.length - shown.length;
                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-ink/5 align-top transition-colors hover:bg-cream/40",
                      selectedIds.has(s.id) && "bg-forest-50/50",
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Избери ${s.email}`}
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                        className="h-4 w-4 rounded border-ink/20"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <AdminNavLink
                        href={href}
                        showSpinner={false}
                        className="group flex min-w-0 items-start gap-2.5"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            s.status === "subscribed"
                              ? "bg-forest-100 text-forest-700"
                              : "bg-ink/5 text-ink-soft",
                          )}
                          aria-hidden
                        >
                          {personInitials(name, s.email)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink group-hover:text-forest-700 group-hover:underline">
                            {name || s.email}
                          </span>
                          {name && (
                            <span className="block truncate text-xs text-ink-soft">{s.email}</span>
                          )}
                          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-ink-soft">
                            {s.phone && <span>{s.phone}</span>}
                            {s.status !== "subscribed" && (
                              <span className="rounded-full bg-ink/10 px-1.5 py-px font-medium">
                                отписан
                              </span>
                            )}
                            {s.locale === "en" && (
                              <span className="rounded-full bg-sky-50 px-1.5 py-px font-medium text-sky-800">
                                EN
                              </span>
                            )}
                          </span>
                        </span>
                      </AdminNavLink>
                    </td>
                    <td className="px-3 py-3">
                      {status ? (
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDialog({
                              ids: [s.id],
                              title: "Смени статуса",
                              subtitle: name ? `${name} · ${s.email}` : s.email,
                              current: s.crm_status_id ?? null,
                            })
                          }
                          title="Смени статуса"
                          className="max-w-full rounded-full text-left hover:opacity-80"
                        >
                          <StatusBadge name={status.name} color={status.color} />
                        </button>
                      ) : statusesAvailable && statuses.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDialog({
                              ids: [s.id],
                              title: "Сложи статус",
                              subtitle: name ? `${name} · ${s.email}` : s.email,
                              current: null,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/20 px-2.5 py-0.5 text-xs text-ink-soft hover:border-forest-400 hover:text-forest-700"
                        >
                          <Plus className="h-3 w-3" /> Статус
                        </button>
                      ) : (
                        <span className="text-ink-soft/50">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {s.crm_status_changed_at ? (
                        <>
                          <span className="block truncate font-medium text-ink">
                            {s.crm_status_changed_by || "-"}
                          </span>
                          <span className="text-ink-soft">
                            {formatShortDate(s.crm_status_changed_at)}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-soft/50">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-soft">
                      {s.crm_status_comment ? (
                        <p className="line-clamp-3 leading-snug" title={s.crm_status_comment}>
                          {s.crm_status_comment}
                        </p>
                      ) : (
                        <span className="text-ink-soft/50">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {chips.length === 0 ? (
                        <span className="text-ink-soft/50">-</span>
                      ) : (
                        <div
                          className="flex flex-wrap gap-1"
                          title={chips.map((c) => c.name).join("\n")}
                        >
                          {shown.map((c) => (
                            <span
                              key={c.key}
                              className="max-w-full truncate rounded-full bg-forest-50 px-2 py-0.5 text-xs text-forest-700"
                            >
                              {c.name}
                            </span>
                          ))}
                          {hidden > 0 && (
                            <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-soft">
                              +{hidden}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <span className="block truncate font-medium text-ink" title={source}>
                        {source}
                      </span>
                      {category !== "other" && source !== SOURCE_CATEGORY_LABELS[category] && (
                        <span className="text-ink-soft">{SOURCE_CATEGORY_LABELS[category]}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-ink-soft [font-variant-numeric:tabular-nums]">
                      {formatShortDate(s.created_at)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <AdminNavLink
                          href={href}
                          showSpinner={false}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-forest-700 hover:bg-forest-50"
                        >
                          <span className="sr-only">Профил на {s.email}</span>
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </AdminNavLink>
                        <button
                          type="button"
                          onClick={() => setEditing(s)}
                          title="Име и групи"
                          aria-label={`Групи на ${s.email}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink"
                        >
                          <Tag className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(s)}
                          disabled={pending}
                          title="Изтрий"
                          aria-label={`Изтрий ${s.email}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">
              Няма контакти по тези филтри.
            </p>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-4 py-3 text-sm">
            <label className="inline-flex items-center gap-2 text-ink-soft">
              На страница
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-ink/15 bg-white px-2 text-sm text-ink"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-ink-soft [font-variant-numeric:tabular-nums]">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} от{" "}
                {filtered.length}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Предишна страница"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 hover:bg-ink/5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[4.5rem] text-center font-medium text-ink [font-variant-numeric:tabular-nums]">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
                aria-label="Следваща страница"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 hover:bg-ink/5 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {statusDialog && (
        <ContactStatusDialog
          ids={statusDialog.ids}
          title={statusDialog.title}
          subtitle={statusDialog.subtitle}
          statuses={statuses}
          currentStatusId={statusDialog.current}
          onClose={() => setStatusDialog(null)}
          onSaved={(message) => {
            setStatusDialog(null);
            setNote({ ok: true, text: message });
            if (statusDialog.ids.length > 1) setSelectedIds(new Set());
            router.refresh();
          }}
        />
      )}

      {editing && (
        <SubscriberEditDialog
          subscriber={editing}
          segments={segments}
          groups={groups}
          customTagOptions={customTagOptions}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setNote({ ok: true, text });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
