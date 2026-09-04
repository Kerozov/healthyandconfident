import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { StatsPeriod } from "@/lib/admin/stats-periods";
import type {
  DashboardAudience,
  DashboardCampaign,
  DashboardOverview,
  DashboardRankedItem,
  DashboardTimelinePoint,
  DashboardTotals,
} from "@/lib/admin/dashboard-types";

const EMPTY_TOTALS: DashboardTotals = {
  visitors: 0,
  pageviews: 0,
  leads: 0,
  checkouts: 0,
  revenueCents: 0,
  orders: 0,
  emailsSent: 0,
  emailsOpened: 0,
  newSubscribers: 0,
};

const EMPTY_AUDIENCE: DashboardAudience = {
  totalSubscribers: 0,
  activeSubscribers: 0,
  totalPosts: 0,
  publishedPosts: 0,
};

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function totalsFrom(raw: unknown): DashboardTotals {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    visitors: num(r.visitors),
    pageviews: num(r.pageviews),
    leads: num(r.leads),
    checkouts: num(r.checkouts),
    revenueCents: num(r.revenueCents),
    orders: num(r.orders),
    emailsSent: num(r.emailsSent),
    emailsOpened: num(r.emailsOpened),
    newSubscribers: num(r.newSubscribers),
  };
}

function rankedFrom(raw: unknown): DashboardRankedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const r = (entry ?? {}) as Record<string, unknown>;
    return {
      id: String(r.id ?? "—"),
      label: String(r.label ?? r.id ?? "—"),
      value: num(r.value),
    };
  });
}

/** `42883` = function missing, `PGRST202` = not in the PostgREST schema cache. */
function rpcMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42883" || error.code === "PGRST202") return true;
  return /admin_dashboard_overview|schema cache/i.test(error.message ?? "");
}

/**
 * Counts-only fallback for the window between deploying this code and running
 * migration 060. Head counts are indexed and cheap; the charts stay hidden
 * (`detailed: false`) rather than pulling rows into Node, which is what used to
 * time the dashboard out.
 */
async function fallbackOverview(
  period: StatsPeriod,
  notice: string,
): Promise<DashboardOverview> {
  const supabase = getAdminClient();
  const since =
    period > 0
      ? new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const sinceFilter = <T extends { gte: (column: string, value: string) => T }>(
    query: T,
    column: string,
  ): T => (since ? query.gte(column, since) : query);

  const [
    pageviews,
    leads,
    checkouts,
    campaignSent,
    campaignOpened,
    autoSent,
    autoOpened,
    newSubs,
    totalSubs,
    activeSubs,
    totalPosts,
    publishedPosts,
    campaigns,
  ] = await Promise.all([
    sinceFilter(
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("event", "pageview"),
      "created_at",
    ),
    sinceFilter(
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("event", "lead"),
      "created_at",
    ),
    sinceFilter(
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("event", "checkout"),
      "created_at",
    ),
    sinceFilter(
      supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent"),
      "sent_at",
    ),
    sinceFilter(
      supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .not("opened_at", "is", null),
      "sent_at",
    ),
    sinceFilter(
      supabase
        .from("automation_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .eq("channel", "email"),
      "sent_at",
    ),
    sinceFilter(
      supabase
        .from("automation_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .eq("channel", "email")
        .not("opened_at", "is", null),
      "sent_at",
    ),
    sinceFilter(
      supabase.from("subscribers").select("id", { count: "exact", head: true }),
      "created_at",
    ),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed"),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }),
    supabase
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("email_campaigns")
      .select("id, subject, segment_tag, recipients_count, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    period,
    currency: "GBP",
    detailed: false,
    notice,
    generatedAt: new Date().toISOString(),
    totals: {
      ...EMPTY_TOTALS,
      pageviews: pageviews.count ?? 0,
      // Distinct visitors need the SQL aggregate; pageviews is the honest stand-in.
      visitors: pageviews.count ?? 0,
      leads: leads.count ?? 0,
      checkouts: checkouts.count ?? 0,
      emailsSent: (campaignSent.count ?? 0) + (autoSent.count ?? 0),
      emailsOpened: (campaignOpened.count ?? 0) + (autoOpened.count ?? 0),
      newSubscribers: newSubs.count ?? 0,
    },
    previous: null,
    audience: {
      totalSubscribers: totalSubs.count ?? 0,
      activeSubscribers: activeSubs.count ?? 0,
      totalPosts: totalPosts.count ?? 0,
      publishedPosts: publishedPosts.count ?? 0,
    },
    timeline: [],
    sources: [],
    topPages: [],
    recentCampaigns: (campaigns.data as DashboardCampaign[] | null) ?? [],
  };
}

/**
 * Everything the admin home shows, in one database round trip.
 *
 * All the counting and daily bucketing happens in Postgres
 * (`admin_dashboard_overview`), so the response size does not grow with the
 * number of visits, deliveries or orders.
 */
export async function getDashboardOverview(
  period: StatsPeriod,
): Promise<DashboardOverview> {
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc("admin_dashboard_overview", {
    p_days: period,
  });

  if (error || !data) {
    // Never let a report problem blank the home screen: fall back to indexed
    // head counts and say why the charts are missing.
    console.error(
      "[admin/dashboard] admin_dashboard_overview:",
      error?.message ?? "no data",
    );
    return fallbackOverview(
      period,
      rpcMissing(error)
        ? "Графиките изискват SQL миграцията 060_admin_dashboard_overview.sql. Дотогава таблото показва само общите числа."
        : "Подробната справка не се зареди, затова таблото показва само общите числа за периода.",
    );
  }

  const raw = data as Record<string, unknown>;

  return {
    period,
    currency: String(raw.currency ?? "GBP").toUpperCase(),
    detailed: true,
    generatedAt: new Date().toISOString(),
    totals: totalsFrom(raw.totals),
    previous: raw.previous ? totalsFrom(raw.previous) : null,
    audience: {
      ...EMPTY_AUDIENCE,
      ...Object.fromEntries(
        Object.entries((raw.audience ?? {}) as Record<string, unknown>).map(
          ([key, value]) => [key, num(value)],
        ),
      ),
    },
    timeline: Array.isArray(raw.timeline)
      ? (raw.timeline as Record<string, unknown>[]).map((point) => ({
          date: String(point.date ?? ""),
          visitors: num(point.visitors),
          pageviews: num(point.pageviews),
          leads: num(point.leads),
          revenueCents: num(point.revenueCents),
          orders: num(point.orders),
          emailsSent: num(point.emailsSent),
          emailsOpened: num(point.emailsOpened),
          newSubscribers: num(point.newSubscribers),
        })) satisfies DashboardTimelinePoint[]
      : [],
    sources: rankedFrom(raw.sources),
    topPages: rankedFrom(raw.topPages),
    recentCampaigns: Array.isArray(raw.recentCampaigns)
      ? (raw.recentCampaigns as DashboardCampaign[])
      : [],
  };
}
