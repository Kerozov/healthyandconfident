import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteEvent, SiteProduct, SiteSection } from "@/lib/supabase/types";

export type SiteContent = {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
};

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

  const sectionMap = Object.fromEntries(sections.map((s) => [s.key, s]));

  return {
    sections: sectionMap,
    events: sectionMap.events?.enabled ? events : [],
    products: sectionMap.products?.enabled ? products : [],
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

  const sections = (sectionsRes.data as SiteSection[]) ?? [];

  return {
    sections: Object.fromEntries(sections.map((s) => [s.key, s])),
    events: (eventsRes.data as SiteEvent[]) ?? [],
    products: (productsRes.data as SiteProduct[]) ?? [],
  };
}
