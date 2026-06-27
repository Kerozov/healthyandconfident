import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteEvent, SiteProduct, SiteSection, SiteSectionKey } from "@/lib/supabase/types";

export type SiteContent = {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  dbReady: boolean;
  dbError?: string;
};

export const DEFAULT_SITE_SECTIONS: Record<SiteSectionKey, SiteSection> = {
  events: {
    key: "events",
    enabled: false,
    title_bg: "Предстоящи събития",
    title_en: "Upcoming events",
    updated_at: new Date().toISOString(),
  },
  products: {
    key: "products",
    enabled: false,
    title_bg: "Продукти",
    title_en: "Products",
    updated_at: new Date().toISOString(),
  },
};

function mergeSections(rows: SiteSection[]): Record<string, SiteSection> {
  const map = { ...DEFAULT_SITE_SECTIONS };
  for (const row of rows) {
    map[row.key as SiteSectionKey] = row;
  }
  return map;
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

export async function getPublicSiteContent(): Promise<SiteContent> {
  const [sections, events, products] = await Promise.all([
    getSiteSections(),
    getSiteEvents(),
    getSiteProducts(),
  ]);

  const sectionMap = mergeSections(sections);

  return {
    sections: sectionMap,
    events: sectionMap.events?.enabled ? events : [],
    products: sectionMap.products?.enabled ? products : [],
    dbReady: true,
  };
}

export async function getAdminSiteContent(): Promise<SiteContent> {
  const supabase = getAdminClient();
  const [sectionsRes, eventsRes, productsRes] = await Promise.all([
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
  ]);

  const dbError =
    sectionsRes.error?.message ??
    eventsRes.error?.message ??
    productsRes.error?.message;

  return {
    sections: mergeSections((sectionsRes.data as SiteSection[]) ?? []),
    events: (eventsRes.data as SiteEvent[]) ?? [],
    products: (productsRes.data as SiteProduct[]) ?? [],
    dbReady: !dbError,
    dbError,
  };
}
