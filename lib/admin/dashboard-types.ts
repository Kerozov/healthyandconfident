/** Dashboard payload shapes. Client-safe — the admin home renders in the browser. */

import type { StatsPeriod } from "@/lib/admin/stats-periods";

export type DashboardTotals = {
  visitors: number;
  pageviews: number;
  leads: number;
  checkouts: number;
  revenueCents: number;
  orders: number;
  emailsSent: number;
  emailsOpened: number;
  newSubscribers: number;
};

export type DashboardAudience = {
  totalSubscribers: number;
  activeSubscribers: number;
  totalPosts: number;
  publishedPosts: number;
};

export type DashboardTimelinePoint = {
  /** `YYYY-MM-DD` in the business timezone. */
  date: string;
  visitors: number;
  pageviews: number;
  leads: number;
  revenueCents: number;
  orders: number;
  emailsSent: number;
  emailsOpened: number;
  newSubscribers: number;
};

export type DashboardRankedItem = {
  id: string;
  label: string;
  value: number;
};

export type DashboardCampaign = {
  id: string;
  subject: string;
  segment_tag: string | null;
  recipients_count: number | null;
  status: string;
  created_at: string;
};

export type DashboardOverview = {
  period: StatsPeriod;
  currency: string;
  /** `false` when the SQL aggregate did not run — totals only, charts hidden. */
  detailed: boolean;
  /** Why the charts are missing, when `detailed` is false. */
  notice?: string;
  generatedAt: string;
  totals: DashboardTotals;
  /** Same-length window before this one, for trend arrows. `null` for all time. */
  previous: DashboardTotals | null;
  audience: DashboardAudience;
  timeline: DashboardTimelinePoint[];
  sources: DashboardRankedItem[];
  topPages: DashboardRankedItem[];
  recentCampaigns: DashboardCampaign[];
};
