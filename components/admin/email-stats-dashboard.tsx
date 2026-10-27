"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { EmailStatsOverview } from "@/lib/admin/email-stats";
import type { AutomationReport } from "@/lib/admin/automation-report";
import { getAutomationDeliveriesReport } from "@/app/(admin)/admin/actions";
import { requestAutomationSync } from "@/lib/admin/automation-sync-client";
import { AutomationReportPanel } from "@/components/admin/automation-report-panel";
import { formatNumber, formatPercent } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";
import { Card } from "@/components/admin/fields";
import { DataTable, TabList } from "@/components/admin/ui";
import {
  ColumnChart,
  CountUp,
  Funnel,
  RankedBars,
  StatTile,
  TimeSeriesChart,
} from "@/components/admin/charts";
import { BuyersPill, RateBar } from "@/components/admin/email-stats-parts";
import { CampaignsTab } from "@/components/admin/email-stats-campaigns";
import { PeopleTab } from "@/components/admin/email-stats-people";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const TIER_LABELS = {
  hot: "Горещи",
  warm: "Топли",
  cold: "Хладни",
  none: "Без реакция",
} as const;

const TRIGGER_LABELS: Record<string, string> = {
  new_subscriber: "Нов абонат",
  purchase: "Покупка",
  registration: "Регистрация",
  form_submit: "След форма",
  segment_entry: "Влизане в група",
};

function shortDay(key: string): string {
  // "2026-08-04" → "4.08"
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

export function EmailStatsDashboard({
  stats,
  canOpenAutomations = false,
}: {
  stats: EmailStatsOverview;
  /** The per-automation detail is behind the automations screen's permission. */
  canOpenAutomations?: boolean;
}) {
  const [tab, setTab] = useState("overview");
  const { totals, trends, timeline, audience } = stats;

  // Per-automation detail is fetched only when a row is opened — the report
  // walks every delivery of that automation, which is too much to preload for
  // the whole table.
  const [openAutomationId, setOpenAutomationId] = useState<string | null>(null);
  const [report, setReport] = useState<AutomationReport | null>(null);
  const [reportError, setReportError] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  async function toggleAutomation(id: string) {
    if (openAutomationId === id) {
      setOpenAutomationId(null);
      setReport(null);
      return;
    }
    setOpenAutomationId(id);
    setReport(null);
    setReportError(false);
    setLoadingReport(true);
    try {
      const res = await getAutomationDeliveriesReport(id);
      if (res.ok) setReport(res.report);
      else setReportError(true);
    } catch {
      setReportError(true);
    } finally {
      setLoadingReport(false);
    }
    // The report is what is stored; pull newer opens from the worker after it.
    const sync = await requestAutomationSync(id);
    if (sync.synced > 0) {
      const fresh = await getAutomationDeliveriesReport(id).catch(() => null);
      // Only if the same automation is still open — another may have been picked meanwhile.
      if (fresh?.ok) {
        setReport((current) =>
          current?.automationId === fresh.report.automationId ? fresh.report : current,
        );
      }
    }
  }

  const labels = timeline.map((p) => shortDay(p.date));
  const funnel = stats.peopleFunnel;
  const pct = (part: number) =>
    funnel.recipients ? Math.round((part / funnel.recipients) * 1000) / 10 : 0;

  return (
    <div className="space-y-8">
      <section
        className="animate-fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-800 via-forest-700 to-forest-600 p-6 text-cream shadow-lg motion-reduce:animate-none sm:p-8"
        aria-label="Обобщение за периода"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-coral-500/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-gold-400/20 blur-3xl"
          aria-hidden
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-cream/70">
          Хората и имейлите за периода
        </p>
        <dl className="relative mt-5 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {[
            { label: "Получили имейл", value: funnel.recipients, sub: `${formatNumber(totals.sent)} имейла общо` },
            { label: "Отворили", value: funnel.opened, sub: `${formatPercent(pct(funnel.opened))} от хората` },
            { label: "Кликнали", value: funnel.clicked, sub: `${formatPercent(pct(funnel.clicked))} от хората` },
            { label: "Купили до 7 дни", value: funnel.bought, sub: `${formatPercent(pct(funnel.bought))} от хората` },
          ].map((item, i) => (
            <div
              key={item.label}
              className="animate-fade-up motion-reduce:animate-none"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <dt className="text-sm text-cream/75">{item.label}</dt>
              <dd className="mt-1 font-display text-4xl font-semibold [font-variant-numeric:tabular-nums] sm:text-5xl">
                <CountUp value={item.value} />
              </dd>
              <dd className="mt-1 text-xs text-cream/70">{item.sub}</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-6 text-xs text-cream/60">
          „Купили“ = платили до 7 дни след имейл. Това е съвпадение по време, не доказателство, че
          имейлът е довел покупката.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Изпратени имейли"
          value={<CountUp value={totals.sent} />}
          delta={trends.sent}
          sub={`${formatNumber(totals.uniqueRecipients)} различни получатели`}
          spark={timeline.map((p) => p.sent)}
        />
        <StatTile
          label="Отворени имейли"
          value={<CountUp value={totals.openRate} suffix="%" decimals={1} />}
          delta={trends.openRate}
          sub={`${formatNumber(totals.opened)} отворени · кликът също се брои`}
        />
        <StatTile
          label="Кликове"
          value={<CountUp value={totals.totalClicks} />}
          delta={trends.clicks}
          sub={`CTOR ${formatPercent(totals.ctor)} от отворилите`}
        />
        <StatTile
          label="Проблеми с доставка"
          value={<CountUp value={totals.failed + totals.bounced} />}
          higherIsBetter={false}
          sub={`${formatNumber(totals.failed)} неуспешни · ${formatNumber(totals.bounced)} върнати · ${formatNumber(totals.scheduled)} чакат`}
        />
      </div>

      <div className="sticky top-0 z-20 -mx-1 bg-cream/85 px-1 py-2 backdrop-blur">
        <TabList
          aria-label="Изглед на статистиката"
          active={tab}
          onChange={setTab}
          contentId="email-stats-panel"
          tabs={[
            { id: "overview", label: "Общо" },
            { id: "campaigns", label: "Кампании", count: stats.campaigns.length },
            { id: "automations", label: "Автоматизации", count: stats.automations.length },
            { id: "people", label: "Хора", count: stats.people.length },
            { id: "links", label: "Линкове", count: stats.topLinks.length },
          ]}
        />
      </div>

      <div id="email-stats-panel" className="scroll-mt-24">
      {tab === "overview" && (
        <div className="space-y-6">
          <Card title="Активност по дни">
            <TimeSeriesChart
              labels={labels}
              series={[
                { key: "sent", label: "Изпратени", values: timeline.map((p) => p.sent) },
                { key: "opened", label: "Отворени", values: timeline.map((p) => p.opened) },
                { key: "clicks", label: "Кликове", values: timeline.map((p) => p.clicks) },
              ]}
            />
            {stats.period === 0 && (
              <p className="mt-3 text-xs text-ink-soft">
                Числата горе са за цялото време; графиката показва последните 90 дни.
              </p>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Пътят на хората - от имейл до покупка">
              <Funnel
                steps={[
                  { label: "Получили имейл", value: funnel.recipients, hint: "поне един изпратен имейл" },
                  { label: "Отворили поне един", value: funnel.opened },
                  { label: "Кликнали поне веднъж", value: funnel.clicked },
                  { label: "Купили до 7 дни след имейл", value: funnel.bought, hint: "съвпадение по време" },
                ]}
              />
            </Card>

            <Card title="Ангажираност на получателите">
              <RankedBars
                data={(["hot", "warm", "cold", "none"] as const).map((tier) => ({
                  id: tier,
                  label: TIER_LABELS[tier],
                  value: stats.tiers[tier],
                }))}
              />
              <p className="mt-4 text-xs text-ink-soft">
                Горещи = отварят над 50% и са кликнали поне 2 пъти. Без реакция = получавали са,
                но не са отворили. Виж ги поименно в „Хора“.
              </p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Кога отварят - час от деня">
              <ColumnChart
                data={stats.opensByHour.map((h) => ({
                  label: `${h.hour}`,
                  value: h.opens,
                  title: `${String(h.hour).padStart(2, "0")}:00 ч.`,
                }))}
              />
              <p className="mt-3 text-xs text-ink-soft">
                Часовете са в българско време. Използвай пиковете, за да избереш час
                за изпращане.
              </p>
            </Card>

            <Card title="Кога отварят - ден от седмицата">
              <ColumnChart
                data={stats.opensByWeekday.map((d) => ({
                  label: WEEKDAYS[d.weekday],
                  value: d.opens,
                  title: WEEKDAYS[d.weekday],
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Аудитория">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Активни абонати", value: audience.subscribed },
                  { label: "Нови за периода", value: audience.newInPeriod },
                  { label: "Отписани", value: audience.unsubscribed },
                  { label: "Спящи", value: audience.inactive },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-ink-soft">{item.label}</dt>
                    <dd className="mt-0.5 font-display text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">
                      <CountUp value={item.value} />
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-ink-soft">
                Спящи = получили поне 3 имейла за периода и не са отворили нито един.
              </p>
              {(stats.sms.sent > 0 || stats.sms.scheduled > 0) && (
                <p className="mt-4 rounded-xl bg-forest-50 px-3 py-2 text-xs text-forest-800">
                  SMS за периода: {formatNumber(stats.sms.sent)} изпратени,{" "}
                  {formatNumber(stats.sms.scheduled)} чакащи,{" "}
                  {formatNumber(stats.sms.failed)} неуспешни.
                </p>
              )}
            </Card>

            <Card title="Отваряне по имейл доставчик">
              {stats.domains.length === 0 ? (
                <p className="text-sm text-ink-soft">Няма изпратени имейли за периода.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.domains.map((row) => (
                    <li key={row.domain} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
                      <span className="truncate text-sm font-medium text-ink">{row.domain}</span>
                      <span className="text-xs text-ink-soft">
                        {formatNumber(row.recipients)} души · {formatNumber(row.sent)} имейла
                      </span>
                      <RateBar value={row.openRate} className="col-span-2" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "campaigns" && <CampaignsTab campaigns={stats.campaigns} />}

      {tab === "automations" && (
        <DataTable
          empty={
            stats.automations.length === 0 ? (
              <p>Няма изпращания от автоматизации за периода.</p>
            ) : undefined
          }
        >
          {stats.automations.length > 0 && (
            <table className="w-full min-w-[48rem] text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-semibold">Автоматизация</th>
                  <th className="p-4 font-semibold">Изпратени</th>
                  <th className="p-4 font-semibold">Отворени</th>
                  <th className="p-4 font-semibold">Кликове</th>
                  <th className="p-4 font-semibold">Купили до 7 дни</th>
                  <th className="p-4 font-semibold">Чакащи</th>
                  <th className="p-4 font-semibold">
                    <span className="sr-only">Детайли</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.automations.map((a) => {
                  const isOpen = openAutomationId === a.id;
                  return (
                  <Fragment key={a.id}>
                  <tr
                    className={cn(
                      "border-b border-ink/5 last:border-0",
                      isOpen && "bg-forest-50/40",
                    )}
                  >
                    <td className="p-4">
                      {canOpenAutomations ? (
                        <button
                          type="button"
                          onClick={() => toggleAutomation(a.id)}
                          className="text-left font-medium text-ink hover:text-forest-700 hover:underline"
                        >
                          {a.name}
                        </button>
                      ) : (
                        <p className="font-medium text-ink">{a.name}</p>
                      )}
                      <p className="text-xs text-ink-soft">
                        {TRIGGER_LABELS[a.trigger] ?? a.trigger}
                        {!a.enabled && " · изключена"}
                      </p>
                    </td>
                    <td className="p-4">{formatNumber(a.sent)}</td>
                    <td className="p-4">
                      <RateBar value={a.openRate} />
                      <span className="text-xs text-ink-soft">{formatNumber(a.opened)} имейла</span>
                    </td>
                    <td className="p-4">
                      <RateBar value={a.clickRate} tone="sky" />
                      <span className="text-xs text-ink-soft">{formatNumber(a.totalClicks)} клика</span>
                    </td>
                    <td className="p-4">
                      <BuyersPill count={a.buyers} />
                    </td>
                    <td className="p-4 text-ink-soft">{formatNumber(a.scheduled)}</td>
                    <td className="p-4 text-right">
                      {canOpenAutomations && (
                      <button
                        type="button"
                        onClick={() => toggleAutomation(a.id)}
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink-soft hover:bg-ink/10"
                      >
                        {isOpen && loadingReport ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        {isOpen ? "Скрий" : "Кой точно"}
                      </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-ink/5 last:border-0">
                      <td colSpan={7} className="bg-cream-2/30 p-4">
                        {loadingReport ? (
                          <p className="text-sm text-ink-soft">
                            Зареждам получателите…
                          </p>
                        ) : report ? (
                          <>
                            <p className="text-xs text-ink-soft">
                              Детайлът по-долу е за цялото време на
                              автоматизацията, не само за избрания период.
                            </p>
                            <AutomationReportPanel
                              report={report}
                              automationName={a.name}
                            />
                          </>
                        ) : reportError ? (
                          <p className="text-sm text-ink-soft">
                            Статистиката не можа да се зареди.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </DataTable>
      )}

      {tab === "people" && <PeopleTab people={stats.people} />}

      {tab === "links" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Най-кликани бутони">
            {stats.topLinks.length === 0 ? (
              <p className="text-sm text-ink-soft">Все още няма кликове за периода.</p>
            ) : (
              <RankedBars
                data={stats.topLinks.map((l) => ({
                  id: `${l.linkLabel}-${l.targetUrl}`,
                  label: l.linkLabel,
                  value: l.clicks,
                  note: `${formatNumber(l.uniqueEmails)} различни хора · ${l.targetUrl}`,
                }))}
              />
            )}
          </Card>

          <Card title="Последни кликове">
            {stats.recentClicks.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Кликовете се записват, когато някой натисне бутон в имейл.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.recentClicks.map((click, i) => (
                  <li
                    key={`${click.email}-${click.clickedAt}-${i}`}
                    className="rounded-xl border border-ink/10 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-ink">{click.email}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {click.sourceType === "campaign" ? "Кампания" : "Автоматизация"}:{" "}
                      {click.sourceTitle}
                      {click.linkLabel ? ` · ${click.linkLabel}` : ""}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft/70">
                      {formatDate(click.clickedAt, "bg")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      </div>
    </div>
  );
}
