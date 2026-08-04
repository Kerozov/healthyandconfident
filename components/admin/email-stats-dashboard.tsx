"use client";

import { useState } from "react";
import type { EmailStatsOverview } from "@/lib/admin/email-stats";
import { formatNumber, formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/admin/fields";
import { Badge, DataTable, TabList } from "@/components/admin/ui";
import {
  ColumnChart,
  RankedBars,
  StatTile,
  TimeSeriesChart,
} from "@/components/admin/charts";

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
};

function shortDay(key: string): string {
  // "2026-08-04" → "4.08"
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

function RateCell({ value }: { value: number }) {
  return (
    <span className="[font-variant-numeric:tabular-nums]">{formatPercent(value)}</span>
  );
}

export function EmailStatsDashboard({ stats }: { stats: EmailStatsOverview }) {
  const [tab, setTab] = useState("overview");
  const { totals, trends, timeline, audience } = stats;

  const labels = timeline.map((p) => shortDay(p.date));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Изпратени имейли"
          value={formatNumber(totals.sent)}
          delta={trends.sent}
          sub={`${formatNumber(totals.uniqueRecipients)} различни получатели`}
        />
        <StatTile
          label="Отворени"
          value={formatNumber(totals.opened)}
          delta={trends.opened}
          sub={`${formatPercent(totals.openRate)} open rate`}
        />
        <StatTile
          label="Кликове"
          value={formatNumber(totals.totalClicks)}
          delta={trends.clicks}
          sub={`${formatNumber(totals.withClicks)} имейла с поне 1 клик`}
        />
        <StatTile
          label="CTR"
          value={formatPercent(totals.clickRate)}
          sub={`CTOR ${formatPercent(totals.ctor)} — от отворилите`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Доставени"
          value={formatPercent(totals.deliveryRate)}
          sub={`${formatNumber(totals.delivered)} потвърдени доставки`}
        />
        <StatTile
          label="Върнати (bounce)"
          value={formatPercent(totals.bounceRate)}
          higherIsBetter={false}
          sub={`${formatNumber(totals.bounced)} адреса`}
        />
        <StatTile
          label="Неуспешни"
          value={formatNumber(totals.failed)}
          higherIsBetter={false}
          sub={`${formatPercent(totals.failRate)} от опитите`}
        />
        <StatTile
          label="Чакащи"
          value={formatNumber(totals.scheduled)}
          sub={`${formatNumber(totals.canceled)} отменени`}
        />
      </div>

      <TabList
        aria-label="Изглед на статистиката"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Общо" },
          { id: "campaigns", label: "Кампании", count: stats.campaigns.length },
          { id: "automations", label: "Автоматизации", count: stats.automations.length },
          { id: "people", label: "Хора" },
          { id: "links", label: "Линкове", count: stats.topLinks.length },
        ]}
      />

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
            <Card title="Кога отварят — час от деня">
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

            <Card title="Кога отварят — ден от седмицата">
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
            <Card title="Ангажираност на получателите">
              <RankedBars
                data={(["hot", "warm", "cold", "none"] as const).map((tier) => ({
                  id: tier,
                  label: TIER_LABELS[tier],
                  value: stats.tiers[tier],
                }))}
              />
              <p className="mt-4 text-xs text-ink-soft">
                Горещи = отварят над 50% и кликат. Без реакция = получавали са, но не
                са отворили.
              </p>
            </Card>

            <Card title="Аудитория">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-soft">Активни абонати</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(audience.subscribed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Нови за периода</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(audience.newInPeriod)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Отписани</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(audience.unsubscribed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Спящи</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(audience.inactive)}
                  </dd>
                </div>
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
          </div>

          <Card title="Доставяемост по имейл доставчик">
            {stats.domains.length === 0 ? (
              <p className="text-sm text-ink-soft">Няма изпратени имейли за периода.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                      <th className="py-2 pr-3 font-semibold">Домейн</th>
                      <th className="py-2 pr-3 font-semibold">Получатели</th>
                      <th className="py-2 pr-3 font-semibold">Изпратени</th>
                      <th className="py-2 pr-3 font-semibold">Отворени</th>
                      <th className="py-2 font-semibold">Open rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.domains.map((row) => (
                      <tr key={row.domain} className="border-b border-ink/5 last:border-0">
                        <td className="py-2 pr-3 font-medium text-ink">{row.domain}</td>
                        <td className="py-2 pr-3">{formatNumber(row.recipients)}</td>
                        <td className="py-2 pr-3">{formatNumber(row.sent)}</td>
                        <td className="py-2 pr-3">{formatNumber(row.opened)}</td>
                        <td className="py-2">
                          <RateCell value={row.openRate} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "campaigns" && (
        <DataTable
          empty={
            stats.campaigns.length === 0 ? (
              <p>Няма кампании за избрания период.</p>
            ) : undefined
          }
        >
          {stats.campaigns.length > 0 && (
            <table className="w-full min-w-[52rem] text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-semibold">Тема</th>
                  <th className="p-4 font-semibold">Изпратени</th>
                  <th className="p-4 font-semibold">Отворени</th>
                  <th className="p-4 font-semibold">Кликове</th>
                  <th className="p-4 font-semibold">CTOR</th>
                  <th className="p-4 font-semibold">Проблеми</th>
                  <th className="p-4 font-semibold">Дата</th>
                </tr>
              </thead>
              <tbody>
                {stats.campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-ink/5 last:border-0">
                    <td className="p-4">
                      <p className="font-medium text-ink">{c.subject}</p>
                      <p className="text-xs text-ink-soft">{c.segment}</p>
                    </td>
                    <td className="p-4">{formatNumber(c.sent)}</td>
                    <td className="p-4">
                      {formatNumber(c.opened)}{" "}
                      <span className="text-xs text-ink-soft">
                        (<RateCell value={c.openRate} />)
                      </span>
                    </td>
                    <td className="p-4">
                      {formatNumber(c.totalClicks)}{" "}
                      <span className="text-xs text-ink-soft">
                        (<RateCell value={c.clickRate} />)
                      </span>
                    </td>
                    <td className="p-4">
                      <RateCell value={c.ctor} />
                    </td>
                    <td className="p-4">
                      {c.failed + c.bounced === 0 ? (
                        <span className="text-ink-soft">—</span>
                      ) : (
                        <Badge tone="warning">
                          {formatNumber(c.failed)} неусп. / {formatNumber(c.bounced)} bounce
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-ink-soft">
                      {c.sentAt ? formatDate(c.sentAt, "bg") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      )}

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
                  <th className="p-4 font-semibold">CTOR</th>
                  <th className="p-4 font-semibold">Чакащи</th>
                </tr>
              </thead>
              <tbody>
                {stats.automations.map((a) => (
                  <tr key={a.id} className="border-b border-ink/5 last:border-0">
                    <td className="p-4">
                      <p className="font-medium text-ink">{a.name}</p>
                      <p className="text-xs text-ink-soft">
                        {TRIGGER_LABELS[a.trigger] ?? a.trigger}
                        {!a.enabled && " · изключена"}
                      </p>
                    </td>
                    <td className="p-4">{formatNumber(a.sent)}</td>
                    <td className="p-4">
                      {formatNumber(a.opened)}{" "}
                      <span className="text-xs text-ink-soft">
                        (<RateCell value={a.openRate} />)
                      </span>
                    </td>
                    <td className="p-4">
                      {formatNumber(a.totalClicks)}{" "}
                      <span className="text-xs text-ink-soft">
                        (<RateCell value={a.clickRate} />)
                      </span>
                    </td>
                    <td className="p-4">
                      <RateCell value={a.ctor} />
                    </td>
                    <td className="p-4 text-ink-soft">{formatNumber(a.scheduled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      )}

      {tab === "people" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Най-активни по кликове">
            <PeopleTable rows={stats.topByClicks} metric="clicks" />
          </Card>
          <Card title="Най-активни по отваряния">
            <PeopleTable rows={stats.topByOpens} metric="opens" />
          </Card>
          <Card title="Спящи абонати" className="xl:col-span-2">
            <p className="mb-4 text-sm text-ink-soft">
              Получили поне 3 имейла и не са отворили нито един. Кандидати за
              реактивираща кампания или за изчистване на списъка.
            </p>
            <PeopleTable rows={stats.inactive} metric="sent" />
          </Card>
        </div>
      )}

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
  );
}

function PeopleTable({
  rows,
  metric,
}: {
  rows: EmailStatsOverview["topByClicks"];
  metric: "clicks" | "opens" | "sent";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">Няма данни за периода.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
            <th className="py-2 pr-3 font-semibold">Абонат</th>
            <th className="py-2 pr-3 font-semibold">Изпратени</th>
            <th className="py-2 pr-3 font-semibold">Отворени</th>
            <th className="py-2 font-semibold">Кликове</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.email} className="border-b border-ink/5 last:border-0">
              <td className="py-2.5 pr-3">
                <span className="font-medium text-ink">{row.name || row.email}</span>
                {row.name && <p className="text-xs text-ink-soft">{row.email}</p>}
              </td>
              <td className={metric === "sent" ? "py-2.5 pr-3 font-semibold" : "py-2.5 pr-3"}>
                {formatNumber(row.sent)}
              </td>
              <td className={metric === "opens" ? "py-2.5 pr-3 font-semibold" : "py-2.5 pr-3"}>
                {formatNumber(row.opened)}
                <span className="ml-1 text-xs text-ink-soft">
                  ({formatPercent(row.openRate)})
                </span>
              </td>
              <td className={metric === "clicks" ? "py-2.5 font-semibold" : "py-2.5"}>
                {formatNumber(row.clicks)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
