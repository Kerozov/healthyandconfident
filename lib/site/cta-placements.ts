import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";

/** Placements where upsell/downsell popups are allowed (not hero, nav, or contact). */
export const UPSELL_SECTION_PLACEMENT_KEYS = [
  "programs_0",
  "programs_1",
  "programs_2",
  "about_cta",
  "outcomes_cta",
  "leadmagnet_cta",
] as const;

export type UpsellSectionPlacementKey = (typeof UPSELL_SECTION_PLACEMENT_KEYS)[number];

/** @deprecated Use UPSELL_SECTION_PLACEMENT_KEYS — kept for migrations */
export const CTA_PLACEMENT_KEYS = [
  ...UPSELL_SECTION_PLACEMENT_KEYS,
  "hero_primary",
  "hero_secondary",
  "nav_cta",
] as const;

export type CtaPlacementKey = (typeof CTA_PLACEMENT_KEYS)[number];

export function isUpsellSectionPlacement(key: string): boolean {
  return (
    key.startsWith("product_") ||
    (UPSELL_SECTION_PLACEMENT_KEYS as readonly string[]).includes(key)
  );
}

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

export function normalizeOfferType(
  type: SiteProduct["offer_type"] | null | undefined,
): SiteProduct["offer_type"] {
  return type === "downsell" ? "downsell" : "upsell";
}

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
  const trimmed = customHeadline?.trim() ?? "";
  if (trimmed) return trimmed;

  const fromOffer = (
    locale === "bg" ? offer.headline_bg : offer.headline_en
  )?.trim() ?? "";
  if (fromOffer) return fromOffer;

  const defaults = DEFAULT_OFFER_HEADLINES[normalizeOfferType(offer.offer_type)];
  return locale === "bg" ? defaults.bg : defaults.en;
}

export function resolveOfferCta(locale: Locale, offer: SiteProduct): string {
  const label = (
    locale === "bg" ? offer.cta_label_bg : offer.cta_label_en
  )?.trim() ?? "";
  if (label) return label;
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

/** Human-readable labels for admin (also applied via migration 017). */
export const SPEAKING_PLACEMENT_LABELS: Record<
  string,
  { label_bg: string; label_en: string }
> = {
  programs_0: {
    label_bg: "Програма „Балансирано хранене 21 дни“ — бутон „Вземи днес“",
    label_en: "Program “Balanced Nutrition 21 Days” — “Get started” button",
  },
  programs_1: {
    label_bg: "Програма „Живей без резистентност“ — бутон „Кандидатствай“",
    label_en: "Program “Live Without Resistance” — “Apply now” button",
  },
  programs_2: {
    label_bg: "Програма „Препрограмирай апетита“ — бутон „Научи повече“",
    label_en: "Program “Reprogram Your Appetite” — “Learn more” button",
  },
  about_cta: {
    label_bg: "Секция „За мен“ — бутон „Работи с мен“",
    label_en: "About section — “Work with me” button",
  },
  outcomes_cta: {
    label_bg: "Секция „Резултати“ — бутон „Запиши безплатен разговор“",
    label_en: "Outcomes section — “Book a free call” button",
  },
  leadmagnet_cta: {
    label_bg: "Безплатно 2-дневно меню — popup след запис на имейл",
    label_en: "Free 2-day menu — popup after email signup",
  },
};

export function productPlacementLabel(title_bg: string, title_en: string) {
  return {
    label_bg: `Магазин: „${title_bg}“ — доп. оферта преди Stripe`,
    label_en: `Shop: “${title_en}” — extra offer before Stripe checkout`,
  };
}
