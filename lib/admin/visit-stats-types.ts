import type { StatsPeriod } from "@/lib/admin/stats-periods";

/** Client-safe types for the visits dashboard — keep out of server-only modules. */

export type VisitTotals = {
  pageviews: number;
  visitors: number;
  sessions: number;
  newVisitors: number;
  returningVisitors: number;
  bounceRate: number;
  pagesPerSession: number;
  avgSessionSeconds: number;
  leads: number;
  checkouts: number;
  purchases: number;
};

export type VisitTrends = {
  pageviews: number | null;
  visitors: number | null;
  sessions: number | null;
  bounceRate: number | null;
};

export type VisitTimePoint = {
  date: string;
  pageviews: number;
  visitors: number;
  sessions: number;
};

export type RankedStat = {
  id: string;
  label: string;
  value: number;
  note?: string;
};

export type VisitStatsOverview = {
  period: StatsPeriod;
  range: {
    days: StatsPeriod;
    since: string | null;
    until: string;
    previousSince: string | null;
    previousUntil: string | null;
  };
  totals: VisitTotals;
  previous: VisitTotals;
  trends: VisitTrends;
  timeline: VisitTimePoint[];
  pages: RankedStat[];
  landings: RankedStat[];
  sources: RankedStat[];
  devices: RankedStat[];
  locales: RankedStat[];
  referrers: RankedStat[];
  campaigns: RankedStat[];
  hours: { hour: number; views: number }[];
  funnel: { visitors: number; leads: number; checkouts: number; purchases: number };
};
