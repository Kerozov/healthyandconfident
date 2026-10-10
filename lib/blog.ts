import { getPublicClient } from "@/lib/supabase/public";
import type { BlogPost, Locale } from "@/lib/supabase/types";

/**
 * Missing env must not crash `next build` / SSG, so no client means "no posts".
 * A failed query is different: it throws, so a broken build or ISR render is
 * thrown away and the last good page keeps being served. Returning [] there
 * froze the blog as "no posts" in the static cache until the next deploy.
 */
function publicClientOrNull() {
  try {
    return getPublicClient();
  } catch {
    return null;
  }
}

export async function getPublishedPosts(locale: Locale): Promise<BlogPost[]> {
  const supabase = publicClientOrNull();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("locale", locale)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Blog posts query failed: ${error.message}`);
  return (data as BlogPost[]) ?? [];
}

export async function getPostBySlug(
  locale: Locale,
  slug: string,
): Promise<BlogPost | null> {
  const supabase = publicClientOrNull();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("locale", locale)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Blog post query failed: ${error.message}`);
  return (data as BlogPost | null) ?? null;
}

export async function getAllPublishedSlugs(): Promise<
  { locale: Locale; slug: string }[]
> {
  const supabase = publicClientOrNull();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("blog_posts")
    .select("locale, slug")
    .eq("status", "published");
  if (error) throw new Error(`Blog slugs query failed: ${error.message}`);
  return (data as { locale: Locale; slug: string }[]) ?? [];
}
