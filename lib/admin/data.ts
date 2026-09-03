import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  BlogPost,
  Subscriber,
  Segment,
  SegmentGroup,
  PopupConfig,
  EmailFooterConfig,
  EmailCampaign,
  SmsCampaign,
  AutomatedEmail,
  SiteProduct,
  SiteGuide,
} from "@/lib/supabase/types";
import { assignableSegments } from "@/lib/segments/hierarchy";
import { fetchAllRows } from "@/lib/admin/stats-shared";

export async function getDashboardStats() {
  const supabase = getAdminClient();
  const [totalSubs, activeSubs, totalPosts, publishedPosts, campaigns] =
    await Promise.all([
      supabase
        .from("subscribers")
        .select("id", { count: "exact", head: true }),
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return {
    totalSubscribers: totalSubs.count ?? 0,
    activeSubscribers: activeSubs.count ?? 0,
    totalPosts: totalPosts.count ?? 0,
    publishedPosts: publishedPosts.count ?? 0,
    recentCampaigns: (campaigns.data as EmailCampaign[]) ?? [],
  };
}

export type DashboardHighlights = {
  /** Paid revenue in the report currency over the last 30 days. */
  revenueCents: number;
  currency: string;
  orders: number;
  emailsSent: number;
  emailsOpened: number;
  openRate: number;
  visitors: number;
  pageviews: number;
};

/**
 * Lightweight 30-day numbers for the dashboard cards. Deliberately not the full
 * reports — those live on /admin/visits, /admin/engagement and /admin/payments.
 */
export async function getDashboardHighlights(): Promise<DashboardHighlights> {
  const supabase = getAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const empty: DashboardHighlights = {
    revenueCents: 0,
    currency: "GBP",
    orders: 0,
    emailsSent: 0,
    emailsOpened: 0,
    openRate: 0,
    visitors: 0,
    pageviews: 0,
  };

  try {
    const [
      purchases,
      campaignSent,
      campaignOpened,
      autoSent,
      autoOpened,
      pageviews,
    ] = await Promise.all([
      supabase
        .from("subscriber_purchases")
        .select("stripe_session_id, order_total_cents, amount_cents, currency")
        .eq("payment_status", "paid")
        .gte("purchased_at", since)
        .limit(2000),
      supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", since),
      supabase
        .from("campaign_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .not("opened_at", "is", null)
        .gte("sent_at", since),
      supabase
        .from("automation_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .eq("channel", "email")
        .gte("sent_at", since),
      supabase
        .from("automation_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .eq("channel", "email")
        .not("opened_at", "is", null)
        .gte("sent_at", since),
      // Counts only — never pull every visit row (that timed out the admin).
      supabase
        .from("site_visits")
        .select("id", { count: "exact", head: true })
        .eq("event", "pageview")
        .gte("created_at", since),
    ]);

    const rows =
      (purchases.data as {
        stripe_session_id: string | null;
        order_total_cents: number | null;
        amount_cents: number | null;
        currency: string | null;
      }[] | null) ?? [];

    const orderTotals = new Map<string, { cents: number; currency: string }>();
    for (const row of rows) {
      const key = row.stripe_session_id ?? `row-${orderTotals.size}`;
      const cents = row.order_total_cents ?? row.amount_cents ?? 0;
      const existing = orderTotals.get(key);
      orderTotals.set(key, {
        cents: Math.max(existing?.cents ?? 0, cents),
        currency: (row.currency ?? existing?.currency ?? "gbp").toUpperCase(),
      });
    }

    const currency = orderTotals.size
      ? [...orderTotals.values()][0].currency
      : "GBP";
    const inCurrency = [...orderTotals.values()].filter(
      (o) => o.currency === currency,
    );

    const emailsSent = (campaignSent.count ?? 0) + (autoSent.count ?? 0);
    const emailsOpened = (campaignOpened.count ?? 0) + (autoOpened.count ?? 0);

    return {
      revenueCents: inCurrency.reduce((sum, o) => sum + o.cents, 0),
      currency,
      orders: inCurrency.length,
      emailsSent,
      emailsOpened,
      openRate: emailsSent
        ? Math.round((emailsOpened / emailsSent) * 1000) / 10
        : 0,
      // Exact unique visitors need a distinct query; pageview count is enough here.
      pageviews: pageviews.count ?? 0,
      visitors: pageviews.count ?? 0,
    };
  } catch (err) {
    console.error(
      "[dashboard] highlights:",
      err instanceof Error ? err.message : err,
    );
    return empty;
  }
}

export async function getPosts(): Promise<BlogPost[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data as BlogPost[]) ?? [];
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  return (data as BlogPost | null) ?? null;
}

export async function getSubscribers(filter?: {
  tag?: string;
  status?: string;
  locale?: string;
}): Promise<Subscriber[]> {
  const supabase = getAdminClient();
  return fetchAllRows<Subscriber>(
    (from, to) => {
      let q = supabase
        .from("subscribers")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (filter?.status)
        q = q.eq("status", filter.status as Subscriber["status"]);
      if (filter?.locale)
        q = q.eq("locale", filter.locale as Subscriber["locale"]);
      if (filter?.tag && filter.tag !== "all")
        q = q.contains("tags", [filter.tag]);
      return q;
    },
    { pageSize: 500, maxPages: 20 },
  );
}

export async function getSegmentGroups(): Promise<SegmentGroup[]> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("segment_groups").select("*").order("name");
  return (data as SegmentGroup[]) ?? [];
}

export async function getSegments(): Promise<Segment[]> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("segments").select("*").order("name");
  return assignableSegments((data as Segment[]) ?? []);
}

/** All unique tags currently assigned to subscribers (for tag-based targeting). */
export async function getSubscriberTags(): Promise<string[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .select("tags")
    .eq("status", "subscribed");
  const tags = new Set<string>();
  for (const row of (data as { tags: string[] }[]) ?? []) {
    for (const tag of row.tags ?? []) {
      if (tag && tag !== "all") tags.add(tag);
    }
  }
  return [...tags].sort();
}

export async function getPopups(): Promise<PopupConfig[]> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("popup_config").select("*").order("locale");
  return (data as PopupConfig[]) ?? [];
}

export async function getEmailFooters(): Promise<EmailFooterConfig[]> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("email_footer_config").select("*").order("locale");
  return (data as EmailFooterConfig[]) ?? [];
}

export async function getAutomatedEmails(): Promise<AutomatedEmail[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automated_emails")
    .select("*")
    .order("trigger")
    .order("locale");
  return (data as AutomatedEmail[]) ?? [];
}

export { getAutomations, getAutomationDeliveries } from "@/lib/admin/automations-data";
export type { AutomationRow } from "@/lib/admin/automations-data";

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as EmailCampaign[]) ?? [];
}

export async function getSmsCampaigns(): Promise<SmsCampaign[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("sms_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as SmsCampaign[]) ?? [];
}

export async function getSiteProducts(includeDisabled = false): Promise<SiteProduct[]> {
  const supabase = getAdminClient();
  let q = supabase
    .from("site_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
  const { data } = await q;
  return (data as SiteProduct[]) ?? [];
}

export async function getSiteGuides(includeDisabled = false): Promise<SiteGuide[]> {
  const supabase = getAdminClient();
  let q = supabase
    .from("site_guides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
  const { data } = await q;
  return (data as SiteGuide[]) ?? [];
}
