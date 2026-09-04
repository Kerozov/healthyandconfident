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
        // `created_at` alone is not a total order — a bulk import writes one
        // timestamp for the whole batch, and tied rows can then repeat or go
        // missing across page boundaries. `id` breaks the tie.
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
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
  // Paged: a single response stops at 1000 rows, which used to hide every tag
  // that only newer subscribers carry.
  const rows = await fetchAllRows<{ tags: string[] }>(
    (from, to) =>
      supabase
        .from("subscribers")
        .select("tags")
        .eq("status", "subscribed")
        .order("email", { ascending: true })
        .range(from, to),
    { pageSize: 1000, maxPages: 200 },
  );
  const tags = new Set<string>();
  for (const row of rows) {
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
