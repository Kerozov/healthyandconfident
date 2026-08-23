import type { Locale } from "@/i18n/config";
import type { SiteGuide } from "@/lib/supabase/types";
import {
  hasOwnCheckout,
  localeStripeBg,
  localeStripeEnOnly,
  stripeForLocale,
  visibleInLocale,
  type StripeCheckout,
} from "@/lib/site/locale-stripe";

export type GuideStripe = StripeCheckout;

export function guideStripeBg(guide: SiteGuide): GuideStripe {
  return localeStripeBg(guide);
}

export function guideStripeEnOnly(guide: SiteGuide): GuideStripe {
  return localeStripeEnOnly(guide);
}

export function guideStripeForLocale(
  guide: SiteGuide,
  locale: Locale,
): GuideStripe {
  return stripeForLocale(guide, locale);
}

export function guideHasCheckout(guide: SiteGuide, locale?: Locale): boolean {
  if (locale) {
    return hasOwnCheckout(guideStripeForLocale(guide, locale));
  }
  return (
    hasOwnCheckout(guideStripeBg(guide)) ||
    hasOwnCheckout(guideStripeEnOnly(guide))
  );
}

export function guideHasCheckoutForLocale(
  guide: SiteGuide,
  locale: Locale,
): boolean {
  return hasOwnCheckout(guideStripeForLocale(guide, locale));
}

export function guideVisibleInLocale(
  guide: SiteGuide,
  locale: Locale,
): boolean {
  return visibleInLocale(guide.enabled, guide.enabled_en, locale);
}

export function guideVisible(guide: SiteGuide): boolean {
  return guide.enabled !== false || guide.enabled_en !== false;
}

export function filterGuidesForLocale(
  guides: SiteGuide[],
  locale: Locale,
): SiteGuide[] {
  return guides.filter((guide) => guideVisibleInLocale(guide, locale));
}

/** @deprecated Use filterGuidesForLocale — kept for callers without a locale. */
export function filterGuidesForSite(guides: SiteGuide[]): SiteGuide[] {
  return guides.filter(guideVisible);
}

/** Can this guide be sold from a page, email, or checkout API? */
export function guideSellable(guide: SiteGuide, locale?: Locale): boolean {
  if (locale) return guideSellableInLocale(guide, locale);
  return guideHasCheckout(guide);
}

export function guideSellableInLocale(
  guide: SiteGuide,
  locale: Locale,
): boolean {
  if (locale === "en" && guide.enabled_en === false) return false;
  return guideHasCheckoutForLocale(guide, locale);
}
