import "server-only";
import { getPublishedPosts } from "@/lib/blog";
import { getSiteProducts, getSiteGuides, getSiteEvents, getSiteProgramCards, getSiteVideos } from "@/lib/site/content";
import { getAdminClient } from "@/lib/supabase/admin";
import { buildPostCatalog, type PublicPostForm } from "@/lib/site/post-catalog";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

async function publicForms(): Promise<PublicPostForm[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  // Forms have no anonymous read policy. Project only public page fields;
  // invitations, submissions, email templates and attachments stay private.
  const { data, error } = await getAdminClient().from("form_templates")
    .select("id, slug, enabled, title_bg, title_en, description_bg, description_en, hero_image_url")
    .eq("enabled", true).order("created_at", { ascending: false });
  if (error) throw new Error(`Public forms query failed: ${error.message}`);
  return (data as PublicPostForm[]) ?? [];
}

export async function getPostCatalog(locale: Locale) {
  const [products, guides, events, programs, videos, posts, forms] = await Promise.all([
    getSiteProducts(), getSiteGuides(), getSiteEvents(), getSiteProgramCards(),
    getSiteVideos(), getPublishedPosts(locale), publicForms(),
  ]);
  return buildPostCatalog({
    products, guides, events, programs, videos, posts, forms,
    fallbackPrograms: getDictionary(locale).programs.items,
  }, locale);
}
