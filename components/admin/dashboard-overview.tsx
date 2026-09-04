"use client";

import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/admin/fields";
import { Badge, DataTable } from "@/components/admin/ui";
import { AdminTextLink } from "@/components/admin/admin-text-link";
import { AdminNavLink } from "@/components/admin/admin-navigation";
import {
  ColumnChart,
  Meter,
  RankedBars,
  StatTile,
  TimeSeriesChart,
} from "@/components/admin/charts";
import {
  STATS_PERIODS,
  STATS_PERIOD_LABELS,
  type StatsPeriod,
} from "@/lib/admin/stats-periods";
import type {
  DashboardOverview,
  DashboardTotals,
} from "@/lib/admin/dashboard-types";
import {
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
} from "@/lib/money";
import { formatDate, cn } from "@/lib/utils";

export type DashboardAccess = {
  visits: boolean;
  payments: boolean;
  engagement: boolean;
  subscribers: boolean;
  blog: boolean;
  campaigns: boolean;
};

/** Percent change vs the previous window; `null` when there is no baseline. */
function trend(current: number, previous: number | undefined): number | null {
  if (previous === undefined) return null;
  if (!previous) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function openRate(totals: DashboardTotals): number {
  if (!totals.emailsSent) return 0;
  return Math.round((totals.emailsOpened / totals.emailsSent) * 1000) / 10;
}

/** `2026-09-04` → `4.09` — the chart axis has no room for the year. */
function shortDay(key: string): string {
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

/** Stat tiles stay clickable — the detail report is one tap from the number. */
function TileLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <AdminNavLink
      href={href}
      showSpinner={false}
      className="block rounded-2xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 [&>div]:h-full [&>div]:hover:border-forest-200 [&>div]:hover:shadow-soft"
    >
      {children}
    </AdminNavLink>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl border border-ink/10 bg-white p-5",
        className,
      )}
    >
      <div className="h-3 w-24 rounded-full bg-ink/10" />
      <div className="mt-4 h-8 w-32 rounded-lg bg-ink/10" />
      <div className="mt-3 h-3 w-20 rounded-full bg-ink/5" />
    </div>
  );
}

export function DashboardOverviewPanel({
  access,
  initialPeriod = 30,
}: {
  access: DashboardAccess;
  initialPeriod?: StatsPeriod;
}) {
  const [period, setPeriod] = React.useState<StatsPeriod>(initialPeriod);
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [loadedAt, setLoadedAt] = React.useState<Date | null>(null);

  // Bumped by the refresh button; a plain state change is enough to re-run the
  // effect without turning the fetch into a callback both places have to share.
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/dashboard?period=${period}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          overview?: DashboardOverview;
          message?: string;
        };
        if (!alive) return;

        if (!res.ok || !body.ok || !body.overview) {
          setError(
            body.message ??
              (res.status === 401 || res.status === 403
                ? "Сесията е изтекла. Презареди и влез отново."
                : `Справката не се зареди (HTTP ${res.status}).`),
          );
          return;
        }

        setData(body.overview);
        setLoadedAt(new Date());
      } catch (err) {
        if (!alive || (err instanceof Error && err.name === "AbortError")) return;
        setError(
          err instanceof Error ? err.message : "Справката не се зареди.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [period, reloadToken]);

  const totals = data?.totals;
  const previous = data?.previous ?? undefined;
  const timeline = data?.timeline ?? [];
  const labels = timeline.map((p) => shortDay(p.date));
  const currency = data?.currency ?? "GBP";
  const hasTimeline = Boolean(data?.detailed) && timeline.length > 0;

  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Период"
          className={cn(
            "inline-flex flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1 transition-opacity",
            loading && "opacity-70",
          )}
        >
          {STATS_PERIODS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              disabled={loading}
              aria-pressed={option === period}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 disabled:cursor-wait",
                option === period
                  ? "bg-forest-600 text-cream"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              {STATS_PERIOD_LABELS[option]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setReloadToken((n) => n + 1)}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Обнови графиките
        </button>

        <p className="text-xs text-ink-soft" aria-live="polite">
          {loading
            ? "Зареждане на справката…"
            : loadedAt
              ? `Обновено в ${loadedAt.toLocaleTimeString("bg-BG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-coral-200 bg-white p-6">
          <p className="flex items-start gap-2 text-sm text-ink">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-coral-500"
              aria-hidden
            />
            {error}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="inline-flex h-10 items-center rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700"
            >
              Опитай отново
            </button>
            {period !== 7 && (
              <button
                type="button"
                onClick={() => setPeriod(7)}
                className="inline-flex h-10 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
              >
                Покажи само 7 дни
              </button>
            )}
          </div>
        </div>
      ) : null}

      {!data && loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}

      {data && totals ? (
        <>
          {!data.detailed && data.notice && (
            <div className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm leading-relaxed text-ink">
              {data.notice}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {access.visits && (
              <TileLink href="/admin/visits">
                <StatTile
                  label="Посетители"
                  value={formatNumber(totals.visitors)}
                  delta={trend(totals.visitors, previous?.visitors)}
                  sub={`${formatNumber(totals.pageviews)} отворени страници`}
                  spark={timeline.map((p) => p.visitors)}
                />
              </TileLink>
            )}
            {access.payments && (
              <TileLink href="/admin/payments">
                <StatTile
                  label="Оборот"
                  value={money(totals.revenueCents)}
                  delta={trend(totals.revenueCents, previous?.revenueCents)}
                  sub={`${formatNumber(totals.orders)} поръчки`}
                  spark={timeline.map((p) => p.revenueCents)}
                />
              </TileLink>
            )}
            {access.engagement && (
              <TileLink href="/admin/engagement">
                <StatTile
                  label="Изпратени имейли"
                  value={formatNumber(totals.emailsSent)}
                  delta={trend(totals.emailsSent, previous?.emailsSent)}
                  sub={`${formatPercent(openRate(totals))} отваряемост`}
                  spark={timeline.map((p) => p.emailsSent)}
                />
              </TileLink>
            )}
            {access.subscribers && (
              <TileLink href="/admin/subscribers">
                <StatTile
                  label="Нови абонати"
                  value={formatNumber(totals.newSubscribers)}
                  delta={trend(totals.newSubscribers, previous?.newSubscribers)}
                  sub={`${formatNumber(data.audience.activeSubscribers)} активни от ${formatNumber(
                    data.audience.totalSubscribers,
                  )}`}
                  spark={timeline.map((p) => p.newSubscribers)}
                />
              </TileLink>
            )}
            {access.blog && (
              <TileLink href="/admin/blog">
                <StatTile
                  label="Публикувани статии"
                  value={formatNumber(data.audience.publishedPosts)}
                  sub={`${formatNumber(data.audience.totalPosts)} общо`}
                />
              </TileLink>
            )}
          </div>

          {hasTimeline && access.visits && (
            <Card title="Посещения по дни">
              <TimeSeriesChart
                labels={labels}
                series={[
                  {
                    key: "visitors",
                    label: "Посетители",
                    values: timeline.map((p) => p.visitors),
                  },
                  {
                    key: "pageviews",
                    label: "Страници",
                    values: timeline.map((p) => p.pageviews),
                  },
                ]}
              />
              {period === 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Числата горе са за цялото време; графиката показва последните 90 дни.
                </p>
              )}
            </Card>
          )}

          {hasTimeline && (access.payments || access.engagement) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {access.payments && (
                <Card title="Оборот по дни">
                  <TimeSeriesChart
                    labels={labels}
                    singleHue
                    height={220}
                    formatValue={(v) => formatMoneyCompact(v, currency)}
                    series={[
                      {
                        key: "revenue",
                        label: "Оборот",
                        values: timeline.map((p) => p.revenueCents),
                      },
                    ]}
                  />
                </Card>
              )}
              {access.engagement && (
                <Card title="Имейли — изпратени и отворени">
                  <TimeSeriesChart
                    labels={labels}
                    height={220}
                    series={[
                      {
                        key: "sent",
                        label: "Изпратени",
                        values: timeline.map((p) => p.emailsSent),
                      },
                      {
                        key: "opened",
                        label: "Отворени",
                        values: timeline.map((p) => p.emailsOpened),
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
          )}

          {hasTimeline && (access.subscribers || access.visits) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {access.subscribers && (
                <Card title="Нови абонати по дни">
                  <ColumnChart
                    data={timeline.map((p) => ({
                      label: shortDay(p.date),
                      value: p.newSubscribers,
                      title: p.date,
                    }))}
                  />
                </Card>
              )}
              {access.visits && (
                <Card title="Фуния за периода">
                  <div className="space-y-4">
                    <Meter
                      label="Посетители"
                      value={totals.visitors}
                      total={totals.visitors || 1}
                    />
                    <Meter
                      label="Записали се"
                      value={totals.leads}
                      total={totals.visitors || 1}
                      valueLabel={`${formatNumber(totals.leads)} · ${formatPercent(
                        totals.visitors
                          ? Math.round((totals.leads / totals.visitors) * 1000) / 10
                          : 0,
                      )}`}
                    />
                    <Meter
                      label="Започнали плащане"
                      value={totals.checkouts}
                      total={totals.visitors || 1}
                      valueLabel={`${formatNumber(totals.checkouts)} · ${formatPercent(
                        totals.visitors
                          ? Math.round((totals.checkouts / totals.visitors) * 1000) / 10
                          : 0,
                      )}`}
                    />
                    <Meter
                      label="Платени поръчки"
                      value={totals.orders}
                      total={totals.visitors || 1}
                      valueLabel={`${formatNumber(totals.orders)} · ${money(
                        totals.revenueCents,
                      )}`}
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

          {data.detailed && access.visits && (data.sources.length > 0 || data.topPages.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Източници на трафик">
                <RankedBars data={data.sources} />
              </Card>
              <Card title="Най-гледани страници">
                <RankedBars data={data.topPages} />
              </Card>
            </div>
          )}

          {access.campaigns && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-ink">
                  Скорошни кампании
                </h2>
                <AdminTextLink
                  href="/admin/campaigns"
                  className="text-sm font-medium text-coral-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
                >
                  Виж всички
                </AdminTextLink>
              </div>

              <DataTable
                empty={
                  data.recentCampaigns.length === 0 ? (
                    <p>Все още няма кампании.</p>
                  ) : undefined
                }
              >
                {data.recentCampaigns.length > 0 && (
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead>
                      <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                        <th className="p-4 font-semibold">Тема</th>
                        <th className="p-4 font-semibold">Сегмент</th>
                        <th className="p-4 font-semibold">Получатели</th>
                        <th className="p-4 font-semibold">Статус</th>
                        <th className="p-4 font-semibold">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentCampaigns.map((c) => (
                        <tr key={c.id} className="border-b border-ink/5 last:border-0">
                          <td className="p-4 font-medium text-ink">{c.subject}</td>
                          <td className="p-4 text-ink-soft">{c.segment_tag ?? "—"}</td>
                          <td className="p-4 text-ink-soft">
                            {formatNumber(c.recipients_count ?? 0)}
                          </td>
                          <td className="p-4">
                            <Badge tone="success">{c.status}</Badge>
                          </td>
                          <td className="p-4 text-ink-soft">
                            {formatDate(c.created_at, "bg")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </DataTable>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
