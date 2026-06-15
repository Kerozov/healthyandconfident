import { getPublicClient } from "@/lib/supabase/public";
import type { BlogPost, Locale } from "@/lib/supabase/types";

export async function getPublishedPosts(locale: Locale): Promise<BlogPost[]> {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("locale", locale)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data as BlogPost[]) ?? [];
  } catch {
    return [];
  }
}

export async function getPostBySlug(
  locale: Locale,
  slug: string,
): Promise<BlogPost | null> {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("locale", locale)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return (data as BlogPost | null) ?? null;
  } catch {
    return null;
  }
}

export async function getAllPublishedSlugs(): Promise<
  { locale: Locale; slug: string }[]
> {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("locale, slug")
      .eq("status", "published");
    return (data as { locale: Locale; slug: string }[]) ?? [];
  } catch {
    return [];
  }
}
