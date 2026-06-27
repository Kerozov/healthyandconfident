import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { resolveOffer, resolveOfferHeadline } from "@/lib/site/cta-placements";
import { OfferPitch } from "@/components/site/offer-pitch";

export function CtaOfferSlot({
  placementKey,
  placements,
  offersById,
  locale,
  compact = false,
  className,
}: {
  placementKey: string;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
  locale: Locale;
  compact?: boolean;
  className?: string;
}) {
  const placement = placements[placementKey];
  if (!placement?.offer_enabled) return null;

  const offer = resolveOffer(placement.offer_id, offersById);
  if (!offer) return null;

  const headline =
    locale === "bg" ? placement.offer_headline_bg : placement.offer_headline_en;

  return (
    <OfferPitch
      offer={offer}
      locale={locale}
      headline={resolveOfferHeadline(locale, offer, headline)}
      compact={compact}
      className={className}
    />
  );
}

export function EventOfferSlot({
  event,
  offersById,
  locale,
}: {
  event: {
    offer_enabled: boolean;
    offer_id: string | null;
    offer_headline_bg: string;
    offer_headline_en: string;
  };
  offersById: Record<string, SiteProduct>;
  locale: Locale;
}) {
  if (!event.offer_enabled) return null;
  const offer = resolveOffer(event.offer_id, offersById);
  if (!offer) return null;

  const headline =
    locale === "bg" ? event.offer_headline_bg : event.offer_headline_en;

  return (
    <OfferPitch
      offer={offer}
      locale={locale}
      headline={resolveOfferHeadline(locale, offer, headline)}
      className="mt-4"
    />
  );
}
