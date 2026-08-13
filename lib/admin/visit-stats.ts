import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  dayKey,
  dayKeysInRange,
  fetchAllRows,
  hourOfDay,
  inRange,
  rate,
  statsRange,
  trend,
  type StatsPeriod,
} from "@/lib/admin/stats-shared";
import {
  VISIT_DEVICE_LABELS,
  VISIT_SOURCE_LABELS,
  visitPathLabel,
  type VisitDevice,
  type VisitSource,
} from "@/lib/analytics/classify";
import type {
  RankedStat,
  VisitStatsOverview,
  VisitTotals,
} from "@/lib/admin/visit-stats-types";

export type {
  RankedStat,
  VisitStatsOverview,
  VisitTimePoint,
  VisitTotals,
  VisitTrends,
} from "@/lib/admin/visit-stats-types";

type VisitRow = {
  created_at: string;
  event: string;
  visitor_id: string;
  session_id: string;
  path: string;
  locale: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  source: string;
  device: string;
};

function emptyTotals(): VisitTotals {
  return {
    pageviews: 0,
    visitors: 0,
    sessions: 0,
    newVisitors: 0,
    returningVisitors: 0,
    bounceRate: 0,
    pagesPerSession: 0,
    avgSessionSeconds: 0,
    leads: 0,
    checkouts: 0,
    purchases: 0,
  };
}

function unique(ids: Iterable<string>): number {
  return new Set(ids).size;
}

function summarize(
  rows: VisitRow[],
  purchases: number,
  firstSeen: Map<string, string>,
  since: string | null,
): VisitTotals {
  const pageviews = rows.filter((r) => r.event === "pageview");
  const visitors = unique(pageviews.map((r) => r.visitor_id));
  const sessionIds = new Set(pageviews.map((r) => r.session_id));

  const pagesBySession = new Map<string, VisitRow[]>();
  for (const row of pageviews) {
    const list = pagesBySession.get(row.session_id);
    if (list) list.push(row);
    else pagesBySession.set(row.session_id, [row]);
  }

  let bounced = 0;
  let durationSum = 0;
  let durationCount = 0;
  for (const pages of pagesBySession.values()) {
    if (pages.length <= 1) {
      bounced += 1;
      continue;
    }
    const times = pages.map((p) => new Date(p.created_at).getTime()).sort((a, b) => a - b);
    const span = (times[times.length - 1] - times[0]) / 1000;
    if (span >= 0 && span < 60 * 60 * 4) {
      durationSum += span;
      durationCount += 1;
    }
  }

  let newVisitors = 0;
  const visitorIds = new Set(pageviews.map((r) => r.visitor_id));
  for (const id of visitorIds) {
    const first = firstSeen.get(id);
    if (!since || (first && first >= since)) newVisitors += 1;
  }

  return {
    pageviews: pageviews.length,
    visitors,
    sessions: sessionIds.size,
    newVisitors,
    returningVisitors: Math.max(0, visitors - newVisitors),
    bounceRate: rate(bounced, sessionIds.size),
    pagesPerSession:
      sessionIds.size > 0
        ? Math.round((pageviews.length / sessionIds.size) * 10) / 10
        : 0,
    avgSessionSeconds:
      durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    leads: unique(rows.filter((r) => r.event === "lead").map((r) => r.visitor_id)),
    checkouts: unique(rows.filter((r) => r.event === "checkout").map((r) => r.visitor_id)),
    purchases,
  };
}

function rank(
  rows: VisitRow[],
  pick: (row: VisitRow) => string | null | undefined,
  label: (key: string) => string,
  limit = 12,
): RankedStat[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, value]) => ({ id, label: label(id), value }));
}

function landingPages(pageviews: VisitRow[], limit = 12): RankedStat[] {
  const firstBySession = new Map<string, VisitRow>();
  for (const row of pageviews) {
    const current = firstBySession.get(row.session_id);
    if (!current || row.created_at < current.created_at) {
      firstBySession.set(row.session_id, row);
    }
  }
  const counts = new Map<string, number>();
  for (const row of firstBySession.values()) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, value]) => ({ id, label: visitPathLabel(id), value }));
}

export async function getVisitStats(period: StatsPeriod): Promise<VisitStatsOverview> {
  const range = statsRange(period);
  const supabase = getAdminClient();
  const fetchSince = range.previousSince ?? range.since;

  const [visitRows, purchaseRows] = await Promise.all([
    fetchAllRows<VisitRow>((from, to) => {
      let q = supabase
        .from("site_visits")
        .select(
          "created_at, event, visitor_id, session_id, path, locale, referrer_host, utm_source, utm_campaign, source, device",
        )
        .order("created_at", { ascending: true })
        .range(from, to);
      if (fetchSince) q = q.gte("created_at", fetchSince);
      return q;
    }),
    fetchAllRows<{ stripe_session_id: string | null; purchased_at: string }>((from, to) => {
      let q = supabase
        .from("subscriber_purchases")
        .select("stripe_session_id, purchased_at")
        .eq("payment_status", "paid")
        .order("purchased_at", { ascending: true })
        .range(from, to);
      if (fetchSince) q = q.gte("purchased_at", fetchSince);
      return q;
    }),
  ]);

  const current = visitRows.filter((r) => inRange(r.created_at, range.since, range.until));
  const previous = visitRows.filter((r) =>
    inRange(r.created_at, range.previousSince, range.previousUntil),
  );

  const firstSeen = new Map<string, string>();
  for (const row of visitRows) {
    if (row.event !== "pageview") continue;
    const existing = firstSeen.get(row.visitor_id);
    if (!existing || row.created_at < existing) firstSeen.set(row.visitor_id, row.created_at);
  }

  const purchaseCount = (since: string | null, until: string | null) => {
    const ids = new Set<string>();
    for (const row of purchaseRows) {
      if (!inRange(row.purchased_at, since, until)) continue;
      ids.add(row.stripe_session_id ?? row.purchased_at);
    }
    return ids.size;
  };

  const totals = summarize(
    current,
    purchaseCount(range.since, range.until),
    firstSeen,
    range.since,
  );
  const prevTotals = range.previousSince
    ? summarize(
        previous,
        purchaseCount(range.previousSince, range.previousUntil),
        firstSeen,
        range.previousSince,
      )
    : emptyTotals();

  const pageviews = current.filter((r) => r.event === "pageview");
  const keys = dayKeysInRange(range);
  const byDay = new Map<string, { pageviews: number; visitors: Set<string>; sessions: Set<string> }>();
  for (const key of keys) {
    byDay.set(key, { pageviews: 0, visitors: new Set(), sessions: new Set() });
  }
  for (const row of pageviews) {
    const key = dayKey(row.created_at);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.pageviews += 1;
    bucket.visitors.add(row.visitor_id);
    bucket.sessions.add(row.session_id);
  }

  const hourCounts = Array.from({ length: 24 }, () => 0);
  for (const row of pageviews) {
    hourCounts[hourOfDay(row.created_at)] += 1;
  }

  const localeLabel = (key: string) =>
    key === "en" ? "English" : key === "bg" ? "Български" : key;

  return {
    period,
    range,
    totals,
    previous: prevTotals,
    trends: {
      pageviews: trend(totals.pageviews, prevTotals.pageviews),
      visitors: trend(totals.visitors, prevTotals.visitors),
      sessions: trend(totals.sessions, prevTotals.sessions),
      bounceRate: trend(totals.bounceRate, prevTotals.bounceRate),
    },
    timeline: keys.map((date) => {
      const bucket = byDay.get(date)!;
      return {
        date,
        pageviews: bucket.pageviews,
        visitors: bucket.visitors.size,
        sessions: bucket.sessions.size,
      };
    }),
    pages: rank(pageviews, (r) => r.path, visitPathLabel),
    landings: landingPages(pageviews),
    sources: rank(
      pageviews,
      (r) => r.source,
      (key) => VISIT_SOURCE_LABELS[key as VisitSource] ?? key,
    ),
    devices: rank(
      pageviews,
      (r) => r.device,
      (key) => VISIT_DEVICE_LABELS[key as VisitDevice] ?? key,
    ),
    locales: rank(pageviews, (r) => r.locale || (r.path.startsWith("/en") ? "en" : "bg"), localeLabel),
    referrers: rank(pageviews, (r) => r.referrer_host, (host) => host, 10),
    campaigns: rank(
      pageviews,
      (r) => r.utm_campaign,
      (key) => key,
      8,
    ),
    hours: hourCounts.map((views, hour) => ({ hour, views })),
    funnel: {
      visitors: totals.visitors,
      leads: totals.leads,
      checkouts: totals.checkouts,
      purchases: totals.purchases,
    },
  };
}
