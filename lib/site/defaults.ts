import type { SiteEvent, SiteProduct, SiteSection, SiteSectionKey, SiteCtaPlacement, Segment } from "@/lib/supabase/types";

export type SiteContent = {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  offersById: Record<string, SiteProduct>;
  ctaPlacements: Record<string, SiteCtaPlacement>;
  segments: Segment[];
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
    title_bg: "Оферти",
    title_en: "Offers",
    updated_at: new Date().toISOString(),
  },
};

export function mergeSiteSections(rows: SiteSection[]): Record<string, SiteSection> {
  const map = { ...DEFAULT_SITE_SECTIONS };
  for (const row of rows) {
    map[row.key as SiteSectionKey] = row;
  }
  return map;
}
