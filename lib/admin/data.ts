import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  BlogPost,
  Subscriber,
  Segment,
  PopupConfig,
  EmailCampaign,
  SmsCampaign,
} from "@/lib/supabase/types";

export async function getDashboardStats() {
  const supabase = getAdminClient();
  const [subs, posts, campaigns] = await Promise.all([
    supabase.from("subscribers").select("id, status", { count: "exact", head: false }),
    supabase.from("blog_posts").select("id, status", { count: "exact", head: false }),
    supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const subscribers = (subs.data as { status: string }[]) ?? [];
  const allPosts = (posts.data as { status: string }[]) ?? [];

  return {
    totalSubscribers: subscribers.length,
    activeSubscribers: subscribers.filter((s) => s.status === "subscribed").length,
    totalPosts: allPosts.length,
    publishedPosts: allPosts.filter((p) => p.status === "published").length,
    recentCampaigns: (campaigns.data as EmailCampaign[]) ?? [],
  };
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
  let q = supabase.from("subscribers").select("*").order("created_at", { ascending: false });
  if (filter?.status)
    q = q.eq("status", filter.status as Subscriber["status"]);
  if (filter?.locale) q = q.eq("locale", filter.locale as Subscriber["locale"]);
  if (filter?.tag && filter.tag !== "all") q = q.contains("tags", [filter.tag]);
  const { data } = await q;
  return (data as Subscriber[]) ?? [];
}

export async function getSegments(): Promise<Segment[]> {
  const supabase = getAdminClient();
  const { data } = await supabase.from("segments").select("*").order("name");
  return (data as Segment[]) ?? [];
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
