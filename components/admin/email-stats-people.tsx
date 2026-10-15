"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { PersonStatRow } from "@/lib/admin/email-stats";
import type { EngagementTier } from "@/lib/admin/engagement";
import { getSubscriberEngagementReport } from "@/app/(admin)/admin/actions";
import {
  PersonStatsPanel,
  type PersonStatsDetail,
} from "@/components/admin/person-stats-panel";
import { FilterChips, RateBar, SearchBox } from "@/components/admin/email-stats-parts";
import { formatNumber } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";

const TIER: Record<EngagementTier, { label: string; className: string }> = {
  hot: { label: "Горещ", className: "bg-coral-500/15 text-coral-700" },
  warm: { label: "Топъл", className: "bg-gold-400/25 text-amber-900" },
  cold: { label: "Хладен", className: "bg-sky-100 text-sky-800" },
  none: { label: "Без реакция", className: "bg-ink/5 text-ink-soft" },
};

type PeopleFilter = "all" | EngagementTier | "bought" | "sleeping";
type PeopleSort = "activity" | "opened" | "clicks" | "sent";

const PAGE = 50;

export function PeopleTab({ people }: { people: PersonStatRow[] }) {
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const [sort, setSort] = useState<PeopleSort>("activity");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [detail, setDetail] = useState<PersonStatsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // Which row the latest request belongs to — a slow answer for a row that was
  // closed or replaced meanwhile is dropped.
  const current = useRef<string | null>(null);

  const counts = useMemo(
    () => ({
      all: people.length,
      hot: people.filter((p) => p.tier === "hot").length,
      warm: people.filter((p) => p.tier === "warm").length,
      cold: people.filter((p) => p.tier === "cold").length,
      none: people.filter((p) => p.tier === "none").length,
      bought: people.filter((p) => p.bought).length,
      sleeping: people.filter((p) => p.sent >= 3 && p.opened === 0).length,
    }),
    [people],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = people.filter((p) => {
      if (q && !p.email.includes(q) && !(p.name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "all") return true;
      if (filter === "bought") return p.bought;
      if (filter === "sleeping") return p.sent >= 3 && p.opened === 0;
      return p.tier === filter;
    });
    if (sort === "activity") return list; // already most engaged first
    const key = { opened: "opened", clicks: "clicks", sent: "sent" } as const;
    return [...list].sort((a, b) => b[key[sort]] - a[key[sort]]);
  }, [people, filter, sort, query]);

  async function toggle(email: string) {
    if (openEmail === email) {
      current.current = null;
      setOpenEmail(null);
      setDetail(null);
      return;
    }
    current.current = email;
    setOpenEmail(email);
    setDetail(null);
    setFailed(false);
    setLoading(true);
    try {
      const res = await getSubscriberEngagementReport(email);
      if (current.current !== email) return;
      setDetail({
        summary: res.summary,
        emails: res.emails,
        activity: res.activity,
        clickEvents: res.clickEvents,
        profile: res.profile,
      });
    } catch {
      if (current.current === email) setFailed(true);
    } finally {
      if (current.current === email) setLoading(false);
    }
  }

  if (people.length === 0) {
    return (
      <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
        Никой не е получил имейл за периода.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterChips
          label="Група хора"
          active={filter}
          onChange={(id) => {
            setFilter(id);
            setLimit(PAGE);
          }}
          options={[
            { id: "all", label: "Всички", count: counts.all },
            { id: "hot", label: "Горещи", count: counts.hot },
            { id: "warm", label: "Топли", count: counts.warm },
            { id: "cold", label: "Хладни", count: counts.cold },
            { id: "none", label: "Без реакция", count: counts.none },
            { id: "bought", label: "Купили до 7 дни", count: counts.bought },
            { id: "sleeping", label: "Спящи", count: counts.sleeping },
          ]}
        />
        <SearchBox value={query} onChange={setQuery} placeholder="Търси по име или имейл" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">
          Горещ = отваря над половината и е кликнал поне 2 пъти. Спящ = получил поне 3 имейла и не
          е отворил нито един. Натисни човек за целия му профил.
        </p>
        <FilterChips
          label="Подреди хората"
          active={sort}
          onChange={setSort}
          options={[
            { id: "activity", label: "Най-активни" },
            { id: "opened", label: "Отваряния" },
            { id: "clicks", label: "Кликове" },
            { id: "sent", label: "Получени" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-soft">
          Няма хора в този филтър.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full min-w-[46rem] text-sm [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                <th className="p-3 font-semibold">Човек</th>
                <th className="p-3 font-semibold">Група</th>
                <th className="p-3 font-semibold">Получени</th>
                <th className="p-3 font-semibold">Отворени</th>
                <th className="p-3 font-semibold">Кликове</th>
                <th className="p-3 font-semibold">Последен имейл</th>
                <th className="p-3">
                  <span className="sr-only">Профил</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((p) => {
                const open = openEmail === p.email;
                return (
                  <Fragment key={p.email}>
                    <tr
                      onClick={() => toggle(p.email)}
                      className={cn(
                        "cursor-pointer border-b border-ink/5 transition-colors last:border-0 hover:bg-forest-50/60",
                        open && "bg-forest-50/80",
                      )}
                    >
                      <td className="p-3">
                        <p className="font-medium text-ink">
                          {p.name || p.email}
                          {p.bought && (
                            <span
                              className="ml-2 rounded-full bg-coral-500/15 px-2 py-0.5 text-[11px] font-semibold text-coral-700"
                              title="Платил до 7 дни след имейл — съвпадение по време"
                            >
                              купил
                            </span>
                          )}
                        </p>
                        {p.name && <p className="text-xs text-ink-soft">{p.email}</p>}
                      </td>
                      <td className="p-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", TIER[p.tier].className)}>
                          {TIER[p.tier].label}
                        </span>
                      </td>
                      <td className="p-3">{formatNumber(p.sent)}</td>
                      <td className="p-3">
                        <RateBar value={p.openRate} />
                      </td>
                      <td className="p-3">{p.clicks > 0 ? formatNumber(p.clicks) : "—"}</td>
                      <td className="p-3 text-xs text-ink-soft">
                        {p.lastSentAt ? formatDate(p.lastSentAt, "bg") : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`Профил на ${p.name || p.email}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(p.email);
                          }}
                          className="rounded-full p-1 text-ink-soft hover:bg-ink/5"
                        >
                          {open && loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-ink/5">
                        <td colSpan={7} className="animate-fade-in bg-cream-2/30 p-4">
                          {loading ? (
                            <p className="flex items-center gap-2 text-sm text-ink-soft">
                              <Loader2 className="h-4 w-4 animate-spin" /> Зареждам профила…
                            </p>
                          ) : detail ? (
                            <PersonStatsPanel email={p.email} name={p.name} detail={detail} />
                          ) : failed ? (
                            <p className="text-sm text-ink-soft">Профилът не можа да се зареди.</p>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {rows.length > limit && (
            <div className="border-t border-ink/5 p-3 text-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="rounded-full bg-ink/5 px-4 py-1.5 text-xs font-semibold text-ink-soft hover:bg-ink/10"
              >
                Покажи още ({formatNumber(rows.length - limit)})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
