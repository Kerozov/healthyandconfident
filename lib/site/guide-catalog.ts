import type { SiteGuide } from "@/lib/supabase/types";

function trimId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function guideHasCheckout(guide: SiteGuide): boolean {
  return Boolean(trimId(guide.stripe_price_id) || trimId(guide.stripe_url));
}

export function guideVisible(guide: SiteGuide): boolean {
  return guide.enabled;
}

export function filterGuidesForSite(guides: SiteGuide[]): SiteGuide[] {
  return guides.filter(guideVisible);
}

/** Can this guide be sold from a page, email, or checkout API? */
export function guideSellable(guide: SiteGuide): boolean {
  return guideHasCheckout(guide);
}
