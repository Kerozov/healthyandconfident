"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { CampaignStatRow } from "@/lib/admin/email-stats";
import type {
  CampaignRecipientState,
  CampaignStatsDetail,
} from "@/lib/admin/campaign-stats-detail";
import { getCampaignStatsDetail } from "@/app/(admin)/admin/actions";
import { Funnel, RankedBars } from "@/components/admin/charts";
import {
  BuyersPill,
  FilterChips,
  RateBar,
  SearchBox,
} from "@/components/admin/email-stats-parts";
import { formatNumber } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";

const STATE_LABEL: Record<CampaignRecipientState, string> = {
  clicked: "Кликнал",
  opened: "Отворил",
  not_opened: "Не е отворил",
  bounced: "Върнат",
  failed: "Неуспешен",
  waiting: "Чака",
};

const STATE_STYLE: Record<CampaignRecipientState, string> = {
  clicked: "bg-sky-100 text-sky-800",
  opened: "bg-forest-500/15 text-forest-700",
  not_opened: "bg-ink/5 text-ink-soft",
  bounced: "bg-gold-400/25 text-amber-900",
  failed: "bg-coral-500/15 text-coral-700",
  waiting: "bg-ink/5 text-ink-soft",
};

type RecipientFilter = "all" | "bought" | "clicked" | "opened" | "not_opened" | "problems";

const PAGE = 60;

function CampaignDetailPanel({ campaign }: { campaign: CampaignStatRow }) {
  const [detail, setDetail] = useState<CampaignStatsDetail | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    getCampaignStatsDetail(campaign.id)
      .then((res) => {
        if (!alive) return;
        if (res.ok) setDetail(res.detail);
        else setError(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [campaign.id]);

  const counts = useMemo(() => {
    const r = detail?.recipients ?? [];
    return {
      all: r.length,
      bought: r.filter((x) => x.boughtAt).length,
      clicked: r.filter((x) => x.state === "clicked").length,
      opened: r.filter((x) => x.state === "opened" || x.state === "clicked").length,
      not_opened: r.filter((x) => x.state === "not_opened").length,
      problems: r.filter((x) => x.state === "bounced" || x.state === "failed").length,
    };
  }, [detail]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (detail?.recipients ?? []).filter((r) => {
      if (q && !r.email.includes(q) && !(r.name ?? "").toLowerCase().includes(q)) return false;
      switch (filter) {
        case "bought":
          return Boolean(r.boughtAt);
        case "clicked":
          return r.state === "clicked";
        case "opened":
          return r.state === "opened" || r.state === "clicked";
        case "not_opened":
          return r.state === "not_opened";
        case "problems":
          return r.state === "bounced" || r.state === "failed";
        default:
          return true;
      }
    });
  }, [detail, filter, query]);

  if (error) {
    return <p className="text-sm text-ink-soft">Детайлът не можа да се зареди.</p>;
  }
  if (!detail) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Зареждам получателите…
      </p>
    );
  }

  const waiting = detail.recipients.filter((r) => r.state === "waiting").length;
  const delivered = counts.all - counts.problems - waiting;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterChips
            label="Филтър на получателите"
            active={filter}
            onChange={(id) => {
              setFilter(id);
              setLimit(PAGE);
            }}
            options={[
              { id: "all", label: "Всички", count: counts.all },
              { id: "opened", label: "Отворили", count: counts.opened },
              { id: "clicked", label: "Кликнали", count: counts.clicked },
              { id: "bought", label: "Купили до 7 дни", count: counts.bought },
              { id: "not_opened", label: "Не са отворили", count: counts.not_opened },
              { id: "problems", label: "Проблеми", count: counts.problems },
            ]}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Търси по име или имейл" />
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink-soft">
            Няма хора в този филтър.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
            <table className="w-full min-w-[36rem] text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                  <th className="px-3 py-2 font-semibold">Човек</th>
                  <th className="px-3 py-2 font-semibold">Резултат</th>
                  <th className="px-3 py-2 font-semibold">Отворен</th>
                  <th className="px-3 py-2 font-semibold">Кликове</th>
                  <th className="px-3 py-2 font-semibold">Купил</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r) => (
                  <tr key={r.email} className="border-b border-ink/5 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-ink">{r.name || r.email}</p>
                      {r.name && <p className="text-xs text-ink-soft">{r.email}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATE_STYLE[r.state])}>
                        {STATE_LABEL[r.state]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-soft">
                      {r.openedAt ? formatDate(r.openedAt, "bg") : "—"}
                    </td>
                    <td className="px-3 py-2">{r.clicks > 0 ? formatNumber(r.clicks) : "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.boughtAt ? (
                        <span className="font-semibold text-coral-700">{formatDate(r.boughtAt, "bg")}</span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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

      <div className="space-y-6">
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Пътят на хората</p>
          <Funnel
            steps={[
              { label: "Получили", value: Math.max(0, delivered), hint: "без върнати и неуспешни" },
              { label: "Отворили", value: counts.opened },
              { label: "Кликнали", value: counts.clicked },
              { label: "Купили до 7 дни", value: counts.bought, hint: "съвпадение по време" },
            ]}
          />
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Кликани линкове</p>
          <RankedBars
            emptyText="Никой не е кликнал линк в този имейл."
            data={detail.links.map((l) => ({
              id: `${l.label}-${l.url}`,
              label: l.label,
              value: l.clicks,
              note: `${formatNumber(l.people)} различни хора`,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

export function CampaignsTab({ campaigns }: { campaigns: CampaignStatRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "open" | "click" | "buyers">("date");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = campaigns.filter(
      (c) => !q || c.subject.toLowerCase().includes(q) || c.segment.toLowerCase().includes(q),
    );
    const by = {
      date: (a: CampaignStatRow, b: CampaignStatRow) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""),
      open: (a: CampaignStatRow, b: CampaignStatRow) => b.openRate - a.openRate,
      click: (a: CampaignStatRow, b: CampaignStatRow) => b.clickRate - a.clickRate,
      buyers: (a: CampaignStatRow, b: CampaignStatRow) => (b.buyers ?? -1) - (a.buyers ?? -1),
    }[sort];
    return [...list].sort(by);
  }, [campaigns, query, sort]);

  if (campaigns.length === 0) {
    return (
      <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
        Няма кампании за избрания период.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Търси кампания" />
        <FilterChips
          label="Подреди кампаниите"
          active={sort}
          onChange={setSort}
          options={[
            { id: "date", label: "Най-нови" },
            { id: "open", label: "Най-отваряни" },
            { id: "click", label: "Най-кликани" },
            { id: "buyers", label: "Най-много купили" },
          ]}
        />
      </div>

      <ul className="space-y-3">
        {rows.map((c, i) => {
          const open = openId === c.id;
          return (
            <li
              key={c.id}
              className={cn(
                "animate-fade-up overflow-hidden rounded-2xl border bg-white transition motion-reduce:animate-none",
                open ? "border-forest-300 shadow-md" : "border-ink/10 hover:border-forest-200 hover:shadow-sm",
              )}
              style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : c.id)}
                aria-expanded={open}
                disabled={!c.hasRecipients}
                className="grid w-full gap-4 p-4 text-left disabled:cursor-default md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_6rem] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{c.subject}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {c.sentAt ? formatDate(c.sentAt, "bg") : "—"} · {formatNumber(c.sent)} изпратени
                    {c.segment ? ` · ${c.segment}` : ""}
                    {c.failed + c.bounced > 0 && (
                      <span className="text-coral-700">
                        {" "}
                        · {formatNumber(c.failed + c.bounced)} проблемни
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">Отворили</p>
                  <RateBar value={c.openRate} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">Кликнали</p>
                  <RateBar value={c.clickRate} tone="sky" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">Купили до 7 дни</p>
                  <BuyersPill count={c.buyers} />
                </div>
                <span className="flex items-center justify-end text-ink-soft">
                  {c.hasRecipients ? (
                    <ChevronDown className={cn("h-5 w-5 transition-transform", open && "rotate-180")} aria-hidden />
                  ) : (
                    <span className="text-right text-[11px] leading-tight">стара, без детайл</span>
                  )}
                </span>
              </button>
              {open && (
                <div className="animate-fade-in border-t border-ink/5 bg-cream-2/30 p-4">
                  <CampaignDetailPanel campaign={c} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
