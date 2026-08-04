import "server-only";

import { SCHEDULE_TIMEZONE } from "@/lib/datetime";
import type { StatsPeriod } from "@/lib/admin/stats-periods";

/** All reporting buckets use the business timezone, not the server's. */
export const STATS_TIMEZONE = SCHEDULE_TIMEZONE;

export {
  STATS_PERIODS,
  STATS_PERIOD_LABELS,
  parseStatsPeriod,
} from "@/lib/admin/stats-periods";
export type { StatsPeriod } from "@/lib/admin/stats-periods";

export type StatsRange = {
  days: StatsPeriod;
  /** Inclusive start, ISO. `null` for all time. */
  since: string | null;
  /** Exclusive end, ISO (now). */
  until: string;
  /** Same-length window immediately before `since` — for trend arrows. */
  previousSince: string | null;
  previousUntil: string | null;
};

export function statsRange(days: StatsPeriod, now = new Date()): StatsRange {
  const until = now.toISOString();
  if (days === 0) {
    return { days, since: null, until, previousSince: null, previousUntil: null };
  }
  const ms = days * 24 * 60 * 60 * 1000;
  const since = new Date(now.getTime() - ms);
  const previousSince = new Date(now.getTime() - ms * 2);
  return {
    days,
    since: since.toISOString(),
    until,
    previousSince: previousSince.toISOString(),
    previousUntil: since.toISOString(),
  };
}

export function inRange(
  iso: string | null | undefined,
  since: string | null,
  until: string | null,
): boolean {
  if (!iso) return false;
  if (since && iso < since) return false;
  if (until && iso >= until) return false;
  return true;
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STATS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: STATS_TIMEZONE,
  hour: "2-digit",
  hour12: false,
});

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: STATS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
});

/** `YYYY-MM-DD` in the business timezone. */
export function dayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return dayFormatter.format(d);
}

/** `YYYY-MM` in the business timezone. */
export function monthKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return monthFormatter.format(d).slice(0, 7);
}

/** 0–23 in the business timezone. */
export function hourOfDay(iso: string | Date): number {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return 0;
  const hour = Number(hourFormatter.format(d).replace(/\D/g, ""));
  return hour === 24 ? 0 : hour;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(iso: string | Date): number {
  const key = dayKey(iso);
  if (!key) return 0;
  const utcDay = new Date(`${key}T12:00:00Z`).getUTCDay();
  return (utcDay + 6) % 7;
}

/**
 * Every `YYYY-MM-DD` from `since` to now — keeps chart gaps visible as zeros.
 * All-time reports fall back to a window, since a daily chart over years is
 * unreadable; the dashboards say so under the chart.
 */
export const ALL_TIME_CHART_DAYS = 90;

export function dayKeysInRange(
  range: StatsRange,
  fallbackDays = ALL_TIME_CHART_DAYS,
): string[] {
  const end = new Date(range.until);
  const start = range.since
    ? new Date(range.since)
    : new Date(end.getTime() - fallbackDays * 24 * 60 * 60 * 1000);

  const keys: string[] = [];
  const cursor = new Date(start);
  // Walk in whole days; the timezone formatter keeps the labels correct.
  for (let i = 0; i < 800 && cursor <= end; i++) {
    keys.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const last = dayKey(end);
  if (keys[keys.length - 1] !== last) keys.push(last);
  return [...new Set(keys)].filter(Boolean);
}

export function rate(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

/** Percent change vs the previous window. `null` when there is no baseline. */
export function trend(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * PostgREST caps a response at 1000 rows. Reports must read everything, so
 * every stats query pages through `range()` until a short page comes back.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  { pageSize = 1000, maxPages = 200 }: { pageSize?: number; maxPages?: number } = {},
): Promise<T[]> {
  const rows: T[] = [];

  for (let i = 0; i < maxPages; i++) {
    const from = i * pageSize;
    const { data, error } = await page(from, from + pageSize - 1);

    if (error) {
      console.error("[stats] query failed:", error.message);
      break;
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "—" : email.slice(at + 1).toLowerCase();
}
