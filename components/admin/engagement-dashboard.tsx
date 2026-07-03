"use client";

import { formatDate } from "@/lib/utils";
import type { EngagementOverview } from "@/lib/admin/engagement";
import { Card } from "@/components/admin/fields";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-forest-700">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export function EngagementDashboard({
  overview,
}: {
  overview: EngagementOverview;
}) {
  const { totals, topByClicks, recentClicks } = overview;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Изпратени имейли" value={totals.emailsSent} />
        <Stat
          label="Отворени"
          value={totals.emailsOpened}
          sub={`${totals.openRate}% open rate`}
        />
        <Stat
          label="Кликове на бутони"
          value={totals.totalClicks}
          sub={`${totals.emailsWithClicks} имейла с поне 1 клик`}
        />
        <Stat
          label="CTR (клик / изпратени)"
          value={`${totals.clickRate}%`}
          sub="Процент имейли с клик"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Най-активни абонати">
          {topByClicks.length === 0 ? (
            <p className="text-sm text-ink-soft">Няма данни още.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-3">Абонат</th>
                    <th className="py-2 pr-3">Изпратени</th>
                    <th className="py-2 pr-3">Отворени</th>
                    <th className="py-2 pr-3">Кликове</th>
                  </tr>
                </thead>
                <tbody>
                  {topByClicks.map((row) => (
                    <tr key={row.email} className="border-b border-ink/5 last:border-0">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium">{row.name || row.email}</p>
                        {row.name && (
                          <p className="text-xs text-ink-soft">{row.email}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{row.emailsSent}</td>
                      <td className="py-2.5 pr-3">
                        {row.emailsOpened}
                        <span className="ml-1 text-xs text-ink-soft">
                          ({row.openRate}%)
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-forest-700">
                        {row.totalClicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Последни кликове">
          {recentClicks.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Кликовете се записват, когато някой натисне бутон в имейл.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentClicks.map((click, i) => (
                <li
                  key={`${click.email}-${click.clickedAt}-${i}`}
                  className="rounded-xl border border-ink/10 px-3 py-2.5"
                >
                  <p className="text-sm font-medium">{click.email}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {click.sourceType === "campaign" ? "Кампания" : "Автоматизация"}:{" "}
                    {click.sourceTitle}
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
    </div>
  );
}
