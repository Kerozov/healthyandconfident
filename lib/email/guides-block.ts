import { publicSiteOrigin } from "@/lib/site";
import { guidePagePath } from "@/lib/site/product-placement";
import { guideSellableInLocale, guideStripeForLocale } from "@/lib/site/guide-catalog";
import { renderEmailOfferCard } from "@/lib/email/offer-card";
import type { EmailProductLinkMode } from "@/lib/email/products-block";
import { normalizeProductLinkMode } from "@/lib/email/products-block";
import type { SiteGuide } from "@/lib/supabase/types";

const GUIDE_MARKER_RE =
  /<!--\s*hc-email-guide:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?::(site|stripe))?\s*-->/gi;

export function guideEmailMarker(
  guideId: string,
  mode: EmailProductLinkMode = "site",
): string {
  return mode === "stripe"
    ? `<!-- hc-email-guide:${guideId}:stripe -->`
    : `<!-- hc-email-guide:${guideId} -->`;
}

export function guidePageUrl(guideId: string, locale: "bg" | "en"): string {
  return `${publicSiteOrigin()}${guidePagePath(guideId, locale)}`;
}

export function extractGuideIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(new RegExp(GUIDE_MARKER_RE.source, "gi"))) {
    if (match[1]) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

export function renderEmailGuideCard(
  guide: SiteGuide,
  locale: "bg" | "en",
  mode: EmailProductLinkMode = "site",
): string {
  const title = locale === "en" ? guide.title_en : guide.title_bg;
  const description =
    locale === "en" ? guide.description_en : guide.description_bg;
  const price =
    locale === "en" ? guide.price_label_en : guide.price_label_bg;
  const paymentLink = guideStripeForLocale(guide, locale).stripe_url;
  const href =
    mode === "stripe" && paymentLink
      ? paymentLink
      : guidePageUrl(guide.id, locale);
  const cta =
    locale === "en" ? "View guide" : "Виж ръководството";

  return renderEmailOfferCard({
    title,
    description,
    price,
    imageUrl: guide.image_url,
    href,
    cta,
  });
}

export function expandEmailGuideMarkers(
  html: string,
  guidesById: Map<string, SiteGuide>,
  locale: "bg" | "en",
): string {
  return html.replace(
    new RegExp(GUIDE_MARKER_RE.source, "gi"),
    (_match, id: string, mode: string | undefined) => {
      const guide = guidesById.get(id.toLowerCase());
      if (!guide || !guideSellableInLocale(guide, locale)) return "";
      return renderEmailGuideCard(guide, locale, normalizeProductLinkMode(mode));
    },
  );
}
