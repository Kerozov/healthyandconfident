"use client";

import type { VisitStatsOverview } from "@/lib/admin/visit-stats-types";
import { formatNumber, formatPercent } from "@/lib/money";
import { Card } from "@/components/admin/fields";
import {
  ColumnChart,
  CountUp,
  Funnel,
  RankedBars,
  StatTile,
  TimeSeriesChart,
} from "@/components/admin/charts";

function shortDay(key: string): string {
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes} мин ${rest} сек` : `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

export function VisitStatsDashboard({ stats }: { stats: VisitStatsOverview }) {
  const { totals, trends, timeline, funnel } = stats;
  const labels = timeline.map((p) => shortDay(p.date));
  const spark = timeline.map((p) => p.visitors);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Уникални посетители"
          value={<CountUp value={totals.visitors} />}
          delta={trends.visitors}
          sub={`${formatNumber(totals.newVisitors)} нови · ${formatNumber(totals.returningVisitors)} върнали се`}
          spark={spark}
        />
        <StatTile
          label="Посещения (страници)"
          value={<CountUp value={totals.pageviews} />}
          delta={trends.pageviews}
          sub={`${formatNumber(totals.pagesPerSession)} страници на сесия`}
        />
        <StatTile
          label="Сесии"
          value={<CountUp value={totals.sessions} />}
          delta={trends.sessions}
          sub={`средно ${formatDuration(totals.avgSessionSeconds)}`}
        />
        <StatTile
          label="Bounce rate"
          value={formatPercent(totals.bounceRate)}
          delta={trends.bounceRate}
          higherIsBetter={false}
          sub="сесии с една страница"
        />
      </div>

      <Card title="Посещения по дни">
        <TimeSeriesChart
          labels={labels}
          series={[
            { key: "visitors", label: "Посетители", values: timeline.map((p) => p.visitors) },
            { key: "sessions", label: "Сесии", values: timeline.map((p) => p.sessions) },
            { key: "pageviews", label: "Страници", values: timeline.map((p) => p.pageviews) },
          ]}
        />
        {stats.period === 0 && (
          <p className="mt-3 text-xs text-ink-soft">
            Числата горе са за цялото време; графиката показва последните 90 дни.
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Фуния - от влизане до плащане">
          <Funnel
            steps={[
              { label: "Посетители", value: funnel.visitors, hint: "различни устройства" },
              { label: "Записали се (lead)", value: funnel.leads },
              { label: "Започнали плащане", value: funnel.checkouts },
            ]}
          />
          <p className="mt-4 rounded-xl bg-forest-50 px-3 py-2 text-xs text-forest-800">
            Платени поръчки за периода: <strong>{formatNumber(funnel.purchases)}</strong>. Не
            са част от фунията, защото плащането не може да се върже с конкретен посетител
            (част от хората плащат от линк в имейл). Подробно - в „Плащания“.
          </p>
        </Card>

        <Card title="Източници на трафик">
          <RankedBars data={stats.sources} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Най-посещавани страници">
          <RankedBars data={stats.pages} />
        </Card>
        <Card title="Входни страници">
          <RankedBars data={stats.landings} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Устройства">
          <RankedBars data={stats.devices} />
        </Card>
        <Card title="Език на сайта">
          <RankedBars data={stats.locales} />
        </Card>
      </div>

      <Card title="Час на посещенията (София)">
        <ColumnChart
          data={stats.hours.map((h) => ({
            label: String(h.hour),
            value: h.views,
            title: `${h.hour}:00`,
          }))}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Сайтове, от които идват">
          <RankedBars
            data={stats.referrers}
            emptyText="Няма външни източници за периода."
          />
        </Card>
        <Card title="UTM кампании">
          <RankedBars
            data={stats.campaigns}
            emptyText="Няма utm_campaign в линковете за периода."
          />
        </Card>
      </div>
    </div>
  );
}
