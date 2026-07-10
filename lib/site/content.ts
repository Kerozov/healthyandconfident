import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  SiteEvent,
  SiteProduct,
  SiteSection,
  SiteCtaPlacement,
  Segment,
  SiteVideo,
  SiteGuide,
} from "@/lib/supabase/types";
import { mergeSiteSections, type SiteContent } from "@/lib/site/defaults";

export type { SiteContent };

function indexOffers(products: SiteProduct[]): Record<string, SiteProduct> {
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

function indexPlacements(rows: SiteCtaPlacement[]): Record<string, SiteCtaPlacement> {
  return Object.fromEntries(rows.map((p) => [p.key, p]));
}

export async function getSiteSegments(): Promise<Segment[]> {
  const supabase = getPublicClient();
  const { data } = await supabase.from("segments").select("*").order("name");
  return (data as Segment[]) ?? [];
}

export async function getCtaPlacements(): Promise<SiteCtaPlacement[]> {
  const supabase = getPublicClient();
  const { data } = await supabase.from("site_cta_placements").select("*").order("key");
  return (data as SiteCtaPlacement[]) ?? [];
}

export async function getSiteSections(): Promise<SiteSection[]> {
  const supabase = getPublicClient();
  const { data } = await supabase.from("site_sections").select("*").order("key");
  return (data as SiteSection[]) ?? [];
}

export async function getSiteEvents(includeDisabled = false): Promise<SiteEvent[]> {
  const supabase = getPublicClient();
  let q = supabase
    .from("site_events")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data as SiteEvent[]) ?? [];
}

export async function getSiteProducts(includeDisabled = false): Promise<SiteProduct[]> {
  const supabase = getPublicClient();
  let q = supabase
    .from("site_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data as SiteProduct[]) ?? [];
}

export async function getSiteGuides(includeDisabled = false): Promise<SiteGuide[]> {
  const supabase = getPublicClient();
  let q = supabase
    .from("site_guides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data as SiteGuide[]) ?? [];
}

export async function getSiteVideos(includeDisabled = false): Promise<SiteVideo[]> {
  const supabase = getPublicClient();
  let q = supabase
    .from("site_videos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!includeDisabled) q = q.eq("enabled", true);
  const { data } = await q;
  return (data as SiteVideo[]) ?? [];
}

export async function getPublicSiteContent(): Promise<SiteContent> {
  const [sections, events, products, guides, videos, placements, segments] = await Promise.all([
    getSiteSections(),
    getSiteEvents(),
    getSiteProducts(),
    getSiteGuides(),
    getSiteVideos(),
    getCtaPlacements(),
    getSiteSegments(),
  ]);

  const sectionMap = mergeSiteSections(sections);
  const offersById = indexOffers(products);

  return {
    sections: sectionMap,
    events: sectionMap.events?.enabled ? events : [],
    products: sectionMap.products?.enabled ? products : [],
    guides: sectionMap.guides?.enabled ? guides : [],
    videos: sectionMap.videos?.enabled ? videos : [],
    offersById,
    ctaPlacements: indexPlacements(placements),
    segments,
    dbReady: true,
  };
}

export async function getAdminSiteContent(): Promise<SiteContent> {
  const supabase = getAdminClient();
  const [sectionsRes, eventsRes, productsRes, guidesRes, videosRes, placementsRes, segmentsRes] =
    await Promise.all([
      supabase.from("site_sections").select("*").order("key"),
      supabase
        .from("site_events")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("site_products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("site_guides")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("site_videos")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("site_cta_placements").select("*").order("key"),
      supabase.from("segments").select("*").order("name"),
    ]);

  const dbError =
    sectionsRes.error?.message ??
    eventsRes.error?.message ??
    productsRes.error?.message ??
    guidesRes.error?.message ??
    videosRes.error?.message ??
    placementsRes.error?.message ??
    segmentsRes.error?.message;

  const products = (productsRes.data as SiteProduct[]) ?? [];

  return {
    sections: mergeSiteSections((sectionsRes.data as SiteSection[]) ?? []),
    events: (eventsRes.data as SiteEvent[]) ?? [],
    products,
    guides: (guidesRes.data as SiteGuide[]) ?? [],
    videos: (videosRes.data as SiteVideo[]) ?? [],
    offersById: indexOffers(products),
    ctaPlacements: indexPlacements((placementsRes.data as SiteCtaPlacement[]) ?? []),
    segments: (segmentsRes.data as Segment[]) ?? [],
    dbReady: !dbError,
    dbError,
  };
}
