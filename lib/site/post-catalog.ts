import type { Locale } from "@/i18n/config";
import type { Program } from "@/i18n/types";
import type { BlogPost, SiteEvent, SiteGuide, SiteProduct, SiteProgramCard, SiteVideo } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import { guideButtonHref, productButtonHref } from "@/lib/site/share-links";
import { programCardForLocale, programCardHref } from "@/lib/site/program-cards";
import { resolveMarkdownHref } from "@/lib/site/markdown-links";
import { parseYoutubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";
import type { PostCatalogItem } from "@/lib/site/post-recommendations";

export type PublicPostForm = Pick<FormTemplateRecord,
  "id" | "slug" | "enabled" | "title_bg" | "title_en" | "description_bg" | "description_en" | "hero_image_url"
>;
export type PostCatalogSource = {
  products: SiteProduct[]; guides: SiteGuide[]; programs: SiteProgramCard[];
  events: SiteEvent[]; videos: SiteVideo[]; posts: BlogPost[]; forms: PublicPostForm[];
  fallbackPrograms?: Program[];
};

/** One public projection, shared by the editor and the public article. */
export function buildPostCatalog(source: PostCatalogSource, locale: Locale, now = new Date()): PostCatalogItem[] {
  const pick = (bg: string, en: string) => (locale === "en" ? en?.trim() : "") || bg?.trim() || "";
  const visible = (row: { enabled: boolean; enabled_en: boolean }) =>
    visibleInLocale(row.enabled, row.enabled_en, locale);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(now);
  const visiblePrograms = source.programs.filter(visible);
  // Match the site's Programs section when there are no visible database cards.
  const programs = visiblePrograms.length
    ? visiblePrograms.map((p) => ({ key: `program:${p.id}`, card: programCardForLocale(p, locale) }))
    : (source.fallbackPrograms ?? []).map((card, index) => ({ key: `program:fallback-${index}`, card }));
  const items: PostCatalogItem[] = [
    ...source.products.filter(visible).map((p): PostCatalogItem => ({
      key: `product:${p.id}`, kind: "product", title: pick(p.title_bg, p.title_en),
      description: pick(p.description_bg, p.description_en), image: p.image_url || "",
      href: productButtonHref(p, locale), price: pick(p.price_label_bg, p.price_label_en),
    })),
    ...source.guides.filter(visible).map((g): PostCatalogItem => ({
      key: `guide:${g.id}`, kind: "guide", title: pick(g.title_bg, g.title_en),
      description: pick(g.description_bg, g.description_en), image: g.image_url || "",
      href: guideButtonHref(g, locale), price: pick(g.price_label_bg, g.price_label_en),
    })),
    ...programs.map(({ key, card }): PostCatalogItem => {
      return {
        key, kind: "program", title: card.title,
        description: card.description, image: card.image || "",
        href: programCardHref(card.href, locale), price: card.price,
      };
    }),
    ...source.events.filter((e) => visible(e) && (!e.event_date || e.event_date.slice(0, 10) >= today))
      .map((e): PostCatalogItem => ({
        key: `event:${e.id}`, kind: "event", title: pick(e.title_bg, e.title_en),
        description: pick(e.description_bg, e.description_en), image: e.image_url || "",
        href: resolveMarkdownHref(pick(e.url, e.url_en), locale), price: "",
        date: e.event_date?.slice(0, 10),
      })),
    ...source.videos.filter(visible).flatMap((v): PostCatalogItem[] => {
      const id = parseYoutubeVideoId(v.youtube_url);
      return id ? [{
        key: `video:${v.id}`, kind: "video", title: pick(v.title_bg, v.title_en),
        description: "", image: youtubeThumbnailUrl(id, "hqdefault"),
        href: `https://www.youtube.com/watch?v=${id}`, price: "",
      }] : [];
    }),
    ...source.posts.filter((p) => p.status === "published" && p.locale === locale)
      .map((p): PostCatalogItem => ({
        key: `post:${p.id}`, kind: "post", title: p.title, description: p.excerpt,
        image: p.cover_image || "", href: `/${locale}/blog/${p.slug}`, price: "",
      })),
    ...source.forms.filter((f) => f.enabled).map((f): PostCatalogItem => ({
      key: `form:${f.id}`, kind: "form", title: pick(f.title_bg, f.title_en),
      description: pick(f.description_bg, f.description_en), image: f.hero_image_url || "",
      href: `/${locale}/forms/${f.slug}`, price: "",
    })),
  ];
  return items.flatMap((item) => {
    const href = resolveMarkdownHref(item.href, locale);
    return item.title && href ? [{ ...item, href }] : [];
  });
}
