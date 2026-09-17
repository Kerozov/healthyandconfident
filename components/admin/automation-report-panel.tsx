"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Search, UserMinus } from "lucide-react";
import { Meter, RankedBars, TimeSeriesChart } from "@/components/admin/charts";
import {
  RECIPIENT_FILTERS,
  RECIPIENT_FILTER_LABELS,
  RECIPIENT_STATE_LABELS,
  matchesRecipientFilter,
  recipientSearchText,
  type AutomationRecipientFilter,
  type AutomationRecipientRow,
  type AutomationRecipientState,
  type AutomationReport,
} from "@/lib/admin/automation-report";
import { SCHEDULE_TIMEZONE } from "@/lib/datetime";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<AutomationRecipientState, string> = {
  clicked: "bg-forest-500/20 text-forest-700",
  opened: "bg-forest-500/10 text-forest-600",
  delivered: "bg-ink/5 text-ink-soft",
  sent: "bg-ink/5 text-ink-soft",
  scheduled: "bg-gold-400/15 text-gold-600",
  bounced: "bg-coral-500/15 text-coral-600",
  failed: "bg-coral-500/15 text-coral-600",
  canceled: "bg-ink/10 text-ink-soft",
  skipped: "bg-ink/10 text-ink-soft",
};

const PAGE_SIZE = 50;

/**
 * Digits only, assembled by hand.
 *
 * A locale-formatted timestamp is not safe here: Node and the browser ship
 * different ICU builds, and `bg-BG` renders the hour as `12:00 ч.` on one and
 * `12:00` on the other — enough to fail hydration on every row in the table.
 */
const TIME_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: SCHEDULE_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = Object.fromEntries(
    TIME_PARTS.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`;
}

function shortDay(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(day)}.${Number(month)}`;
}

function csvCell(value: string | number | null): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(name: string, rows: AutomationRecipientRow[]) {
  const header = [
    "Име",
    "Имейл",
    "Телефон",
    "Статус",
    "Изпратен",
    "Доставен",
    "Отворен",
    "Кликове",
    "Първи клик",
    "Последен клик",
    "Кликнати линкове",
    "В списъка",
    "Грешка",
  ];

  const body = rows.map((row) =>
    [
      row.name ?? "",
      row.email,
      row.phone ?? "",
      RECIPIENT_STATE_LABELS[row.state],
      row.status === "scheduled" ? row.scheduledFor ?? "" : row.sentAt,
      row.deliveredAt ?? "",
      row.openedAt ?? "",
      row.clicks,
      row.firstClickedAt ?? "",
      row.lastClickedAt ?? "",
      row.links.map((l) => `${l.label} (${l.clicks})`).join(" | "),
      row.subscriberStatus === "unsubscribed" ? "отписан" : "да",
      row.error ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  // BOM so Excel opens the Cyrillic columns without a manual import step.
  const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...body].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name || "automation"}-получатели.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function Rate({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-semibold leading-none text-ink",
          tone === "good" && "text-forest-600",
          tone === "bad" && "text-coral-600",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-ink-soft">{sub}</p>}
    </div>
  );
}

export function AutomationReportPanel({
  report,
  automationName,
}: {
  report: AutomationReport;
  automationName: string;
}) {
  const [filter, setFilter] = useState<AutomationRecipientFilter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { totals, counts } = report;
  const isEmail = report.channel === "email";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return report.recipients.filter((row) => {
      if (!matchesRecipientFilter(row, filter)) return false;
      if (!needle) return true;
      return recipientSearchText(row).includes(needle);
    });
  }, [report.recipients, filter, query]);

  const shown = filtered.slice(0, visible);
  const hasTimeline =
    report.timeline.length > 1 &&
    report.timeline.some((p) => p.sent + p.opened + p.clicks > 0);

  return (
    <div className="mt-4 space-y-5 rounded-2xl bg-cream-2/40 p-4">
      {/* Funnel — the four numbers the whole screen is about. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
            Фуния
          </p>
          <Meter
            label="Изпратени"
            value={totals.sent}
            total={totals.sent || 1}
            valueLabel={`${totals.sent}`}
          />
          {isEmail && (
            <>
              <Meter
                label="Доставени"
                value={totals.delivered}
                total={totals.sent || 1}
                valueLabel={`${totals.delivered} · ${totals.deliveryRate}%`}
              />
              <Meter
                label="Отворили"
                value={totals.opened}
                total={totals.sent || 1}
                valueLabel={`${totals.opened} · ${totals.openRate}%`}
              />
              <Meter
                label="Кликнали"
                value={totals.clicked}
                total={totals.sent || 1}
                valueLabel={`${totals.clicked} · ${totals.clickRate}%`}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Rate
            label="Получатели"
            value={`${totals.recipients}`}
            sub={`${totals.sent} изпращания`}
          />
          {isEmail && (
            <>
              <Rate
                label="Отваряемост"
                value={`${totals.openRate}%`}
                sub={`${totals.opened} от ${totals.sent}`}
                tone="good"
              />
              <Rate
                label="CTR"
                value={`${totals.clickRate}%`}
                sub={`${totals.totalClicks} клика общо`}
                tone="good"
              />
              <Rate
                label="CTOR"
                value={`${totals.ctor}%`}
                sub="кликнали от отворилите"
              />
              <Rate
                label="Неотворили"
                value={`${totals.notOpened}`}
                sub="без bounce и грешки"
              />
              <Rate
                label="Върнати"
                value={`${totals.bounced}`}
                sub={`${totals.bounceRate}% bounce`}
                tone={totals.bounced > 0 ? "bad" : undefined}
              />
            </>
          )}
          {totals.scheduled > 0 && (
            <Rate label="Насрочени" value={`${totals.scheduled}`} sub="чакат изпращане" />
          )}
          {totals.failed > 0 && (
            <Rate label="Грешки" value={`${totals.failed}`} tone="bad" />
          )}
          {totals.unsubscribed > 0 && (
            <Rate
              label="Отписали се"
              value={`${totals.unsubscribed}`}
              sub="вече не са в списъка"
            />
          )}
        </div>
      </div>

      <p className="text-xs text-ink-soft">
        {report.firstSentAt ? (
          <>
            Първо изпращане {when(report.firstSentAt)} · последно{" "}
            {when(report.lastSentAt)}
          </>
        ) : (
          "Още няма изпратени имейли."
        )}
        {report.lastActivityAt && (
          <> · последна реакция {when(report.lastActivityAt)}</>
        )}
        <span className="text-ink-soft/60"> · часовете са софийско време</span>
      </p>

      {hasTimeline && (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
            По дни
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              height={200}
              labels={report.timeline.map((p) => shortDay(p.date))}
              series={[
                {
                  key: "sent",
                  label: "Изпратени",
                  values: report.timeline.map((p) => p.sent),
                },
                {
                  key: "opened",
                  label: "Отваряния",
                  values: report.timeline.map((p) => p.opened),
                },
                {
                  key: "clicks",
                  label: "Кликове",
                  values: report.timeline.map((p) => p.clicks),
                },
              ]}
            />
          </div>
        </div>
      )}

      {report.links.length > 0 && (
        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
            Кликнати линкове
          </p>
          <div className="mt-3">
            <RankedBars
              data={report.links.slice(0, 8).map((link, i) => ({
                id: `${link.url}-${i}`,
                label: link.label,
                value: link.clicks,
                note: `${link.uniqueClickers} човека · ${link.url}`,
              }))}
            />
          </div>
        </div>
      )}

      {/* Who exactly. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {RECIPIENT_FILTERS.filter(
            (f) => f === "all" || counts[f] > 0 || f === filter,
          ).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f);
                setVisible(PAGE_SIZE);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                filter === f
                  ? "bg-forest-600 text-cream"
                  : "bg-ink/10 text-ink-soft hover:bg-ink/15",
              )}
            >
              {RECIPIENT_FILTER_LABELS[f]}
              <span className="ml-1.5 opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Търси по име или имейл…"
              className="h-9 w-full rounded-full border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-forest-500"
            />
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(automationName, filtered)}
            disabled={filtered.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 text-xs font-semibold text-ink-soft hover:bg-ink/5 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            Свали CSV ({filtered.length})
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
          {shown.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">
              Няма получатели в тази извадка.
            </p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                  <th className="px-4 py-2">Получател</th>
                  <th className="px-4 py-2">Статус</th>
                  <th className="px-4 py-2">Изпратен</th>
                  {isEmail && <th className="px-4 py-2">Отворен</th>}
                  {isEmail && <th className="px-4 py-2">Кликове</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5 align-top last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        {row.name && (
                          <span className="font-medium text-ink">{row.name}</span>
                        )}
                        {row.subscriberId ? (
                          <Link
                            href={`/admin/contacts/${row.subscriberId}`}
                            className="inline-flex items-center gap-1 font-mono text-xs text-forest-700 hover:underline"
                          >
                            {row.email}
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </Link>
                        ) : (
                          <span className="font-mono text-xs text-ink-soft">
                            {row.email}
                          </span>
                        )}
                        {row.phone && report.channel === "sms" && (
                          <span className="font-mono text-xs text-ink-soft">
                            {row.phone}
                          </span>
                        )}
                        {row.subscriberStatus === "unsubscribed" && (
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-coral-600">
                            <UserMinus className="h-3 w-3" aria-hidden />
                            отписан
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATE_STYLES[row.state],
                        )}
                      >
                        {RECIPIENT_STATE_LABELS[row.state]}
                      </span>
                      {row.error && (
                        <p
                          className="mt-1 max-w-[220px] truncate text-[11px] text-coral-600"
                          title={row.error}
                        >
                          {row.error}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">
                      {row.status === "scheduled" && row.scheduledFor
                        ? `насрочен ${when(row.scheduledFor)}`
                        : when(row.sentAt)}
                      {isEmail && row.deliveredAt && (
                        <p className="text-[11px] text-ink-soft/70">
                          доставен {when(row.deliveredAt)}
                        </p>
                      )}
                    </td>
                    {isEmail && (
                      <td className="px-4 py-2.5 text-xs text-ink-soft">
                        {row.openedAt ? (
                          when(row.openedAt)
                        ) : row.opened ? (
                          "да"
                        ) : (
                          <span className="text-ink-soft/50">—</span>
                        )}
                      </td>
                    )}
                    {isEmail && (
                      <td className="px-4 py-2.5 text-xs">
                        {row.clicks > 0 ? (
                          <div>
                            <span className="font-semibold text-forest-700">
                              {row.clicks}
                            </span>
                            {row.firstClickedAt && (
                              <p className="text-[11px] text-ink-soft/70">
                                първи {when(row.firstClickedAt)}
                              </p>
                            )}
                            {row.links.length > 0 && (
                              <ul className="mt-1 space-y-0.5">
                                {row.links.map((link) => (
                                  <li
                                    key={`${row.id}-${link.url}-${link.label}`}
                                    className="max-w-[240px] truncate text-[11px] text-ink-soft"
                                    title={`${link.label} — ${link.url}`}
                                  >
                                    {link.label} · {link.clicks}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-soft/50">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > shown.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE * 4)}
            className="w-full rounded-xl border border-ink/10 bg-white py-2 text-xs font-semibold text-ink-soft hover:bg-ink/5"
          >
            Покажи още ({filtered.length - shown.length})
          </button>
        )}
      </div>
    </div>
  );
}
