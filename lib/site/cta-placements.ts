import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";

export const CTA_PLACEMENT_KEYS = [
  "hero_primary",
  "hero_secondary",
  "nav_cta",
  "contact_cta",
  "about_cta",
  "programs_0",
  "programs_1",
  "programs_2",
] as const;

export type CtaPlacementKey = (typeof CTA_PLACEMENT_KEYS)[number];

export const DEFAULT_OFFER_HEADLINES = {
  upsell: {
    bg: "Мислим, че може да ти хареса",
    en: "We think you might like this",
  },
  downsell: {
    bg: "Специална оферта за теб",
    en: "A special offer for you",
  },
} as const;

export const DEFAULT_OFFER_CTA = {
  bg: "Виж офертата",
  en: "View offer",
} as const;

export function resolveOffer(
  offerId: string | null | undefined,
  offersById: Record<string, SiteProduct>,
): SiteProduct | null {
  if (!offerId) return null;
  const offer = offersById[offerId];
  if (!offer?.enabled) return null;
  return offer;
}

export function resolveOfferHeadline(
  locale: Locale,
  offer: SiteProduct,
  customHeadline?: string,
): string {
  const trimmed = customHeadline?.trim();
  if (trimmed) return trimmed;

  const fromOffer =
    locale === "bg" ? offer.headline_bg : offer.headline_en;
  if (fromOffer.trim()) return fromOffer.trim();

  const defaults = DEFAULT_OFFER_HEADLINES[offer.offer_type];
  return locale === "bg" ? defaults.bg : defaults.en;
}

export function resolveOfferCta(locale: Locale, offer: SiteProduct): string {
  const label = locale === "bg" ? offer.cta_label_bg : offer.cta_label_en;
  if (label.trim()) return label.trim();
  return locale === "bg" ? DEFAULT_OFFER_CTA.bg : DEFAULT_OFFER_CTA.en;
}

export function getPlacementOffer(
  placement: SiteCtaPlacement | undefined,
  offersById: Record<string, SiteProduct>,
): { offer: SiteProduct; headline: string } | null {
  if (!placement?.offer_enabled) return null;
  const offer = resolveOffer(placement.offer_id, offersById);
  if (!offer) return null;
  return {
    offer,
    headline: "", // caller passes locale
  };
}

export function placementLabel(placement: SiteCtaPlacement, locale: Locale): string {
  return locale === "bg" ? placement.label_bg : placement.label_en;
}
