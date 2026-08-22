import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { productVisibleInLocale } from "@/lib/site/product-locale";

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
    (UPSELL_SECTION_PLACEMENT_KEYS as readonly string[]).includes(key) ||
    /^programs_\d+_(secondary|pricing_\d+)$/.test(key)
  );
}

export const DEFAULT_OFFER_HEADLINE = {
  bg: "Мислим, че може да ти хареса",
  en: "We think you might like this",
} as const;

/** @deprecated Use DEFAULT_OFFER_HEADLINE — product type is not shown in admin */
export const DEFAULT_OFFER_HEADLINES = {
  upsell: DEFAULT_OFFER_HEADLINE,
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
  locale?: Locale,
): SiteProduct | null {
  if (!offerId) return null;
  const offer = offersById[offerId];
  if (!offer?.enabled) return null;
  if (locale && !productVisibleInLocale(offer, locale)) return null;
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

  const defaults = DEFAULT_OFFER_HEADLINE;
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
  locale?: Locale,
): { offer: SiteProduct; headline: string } | null {
  if (!placement?.offer_enabled) return null;
  const offer = resolveOffer(placement.offer_id, offersById, locale);
  if (!offer) return null;
  return {
    offer,
    headline: "", // caller passes locale
  };
}

export type ResolvedOffer = { offer: SiteProduct; headline: string };

/**
 * The upsell shown before checkout and the downsell shown if it is declined.
 *
 * An offer is dropped when it *is* the product being bought — that would put
 * the same line item in the Stripe session twice and show the buyer what they
 * already have in hand. The guard lives here rather than only in the admin so
 * older, misconfigured rows cannot reach a customer.
 */
export function resolvePlacementOffers(
  placement: SiteCtaPlacement | undefined,
  offersById: Record<string, SiteProduct>,
  locale: Locale,
  baseProductId?: string | null,
): { upsell: ResolvedOffer | null; downsell: ResolvedOffer | null } {
  function pick(
    enabled: boolean | undefined,
    offerId: string | null | undefined,
    headlineBg: string | undefined,
    headlineEn: string | undefined,
  ): ResolvedOffer | null {
    if (!enabled) return null;
    const offer = resolveOffer(offerId, offersById, locale);
    if (!offer) return null;
    if (baseProductId && offer.id === baseProductId) return null;
    const custom = locale === "bg" ? headlineBg : headlineEn;
    return { offer, headline: resolveOfferHeadline(locale, offer, custom) };
  }

  const upsell = pick(
    placement?.offer_enabled,
    placement?.offer_id,
    placement?.offer_headline_bg,
    placement?.offer_headline_en,
  );
  const downsell = pick(
    placement?.downsell_enabled,
    placement?.downsell_offer_id,
    placement?.downsell_headline_bg,
    placement?.downsell_headline_en,
  );

  // Offering the same product twice in a row reads as a bug to the buyer.
  if (upsell && downsell && upsell.offer.id === downsell.offer.id) {
    return { upsell, downsell: null };
  }
  return { upsell, downsell };
}

export function placementLabel(placement: SiteCtaPlacement, locale: Locale): string {
  return locale === "bg" ? placement.label_bg : placement.label_en;
}

export function programSecondaryPlacementKey(baseKey: string): string {
  return `${baseKey}_secondary`;
}

export function programPricingPlacementKey(baseKey: string, index: number): string {
  return `${baseKey}_pricing_${index}`;
}

/** Admin-editable button text/URL with fallback from page content. */
export function resolvePlacementButton(
  placements: Record<string, SiteCtaPlacement>,
  key: string,
  locale: Locale,
  fallback: { label: string; href: string },
): { label: string; href: string } {
  const placement = placements[key];
  const customLabel = (
    locale === "bg" ? placement?.button_label_bg : placement?.button_label_en
  )?.trim();
  const customHref = placement?.button_url?.trim();
  return {
    label: customLabel || fallback.label,
    href: customHref || fallback.href,
  };
}

/** Human-readable labels for admin (also applied via migration 017). */
export const SPEAKING_PLACEMENT_LABELS: Record<
  string,
  { label_bg: string; label_en: string }
> = {
  programs_0: {
    label_bg: "Програми — картичка „Гарнитури“ (€3)",
    label_en: "Programs — “Side dishes” card (€3)",
  },
  programs_1: {
    label_bg: "Живей без резистентност — „Включи се днес“ (горен бутон)",
    label_en: "Live Without Resistance — “Join today” (hero primary)",
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
  challenge_21_cta: {
    label_bg: "21-дневно предизвикателство — бутон „Вземи днес“",
    label_en: "21-day challenge — “Get it today” button",
  },
};

export function productPlacementLabel(title_bg: string, title_en: string) {
  return {
    label_bg: `Магазин: „${title_bg}“ — доп. оферта преди Stripe`,
    label_en: `Shop: “${title_en}” — extra offer before Stripe checkout`,
  };
}
