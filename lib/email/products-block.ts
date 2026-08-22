import { publicSiteOrigin } from "@/lib/site";
import { productCheckoutPath } from "@/lib/site/product-placement";
import {
  productSellableInLocale,
  productStripeForLocale,
} from "@/lib/site/product-locale";
import { renderEmailOfferCard } from "@/lib/email/offer-card";
import type { SiteProduct } from "@/lib/supabase/types";

/**
 * Where a product card in an email sends the reader.
 *
 * `site` (the default) lands on the product page, which runs the upsell and
 * downsell configured for that product before handing over to Stripe — the
 * only path that also records the purchase against the subscriber.
 * `stripe` jumps straight to the product's Payment Link, skipping all of it.
 */
export type EmailProductLinkMode = "site" | "stripe";

const PRODUCT_MARKER_RE =
  /<!--\s*hc-email-product:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?::(site|stripe))?\s*-->/gi;

export function productEmailMarker(
  productId: string,
  mode: EmailProductLinkMode = "site",
): string {
  return mode === "stripe"
    ? `<!-- hc-email-product:${productId}:stripe -->`
    : `<!-- hc-email-product:${productId} -->`;
}

/** Absolute form of the product page — emails need the full origin. */
export function productCheckoutUrl(
  productId: string,
  locale: "bg" | "en",
): string {
  return `${publicSiteOrigin()}${productCheckoutPath(productId, locale)}`;
}

export function normalizeProductLinkMode(
  value: string | null | undefined,
): EmailProductLinkMode {
  return value === "stripe" ? "stripe" : "site";
}

export function extractProductIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(new RegExp(PRODUCT_MARKER_RE.source, "gi"))) {
    if (match[1]) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

function productCtaLabel(product: SiteProduct, locale: "bg" | "en"): string {
  const custom = locale === "en" ? product.cta_label_en : product.cta_label_bg;
  if (custom.trim()) return custom.trim();
  return locale === "en" ? "View program" : "Виж програмата";
}

export function renderEmailProductCard(
  product: SiteProduct,
  locale: "bg" | "en",
  mode: EmailProductLinkMode = "site",
): string {
  const title = locale === "en" ? product.title_en : product.title_bg;
  const description =
    locale === "en" ? product.description_en : product.description_bg;
  const price =
    locale === "en" ? product.price_label_en : product.price_label_bg;
  const paymentLink = productStripeForLocale(product, locale).stripe_url;
  // Falls back to the site page when the direct link is missing, so a product
  // set up with a Price ID only still shows up in the email.
  const href =
    mode === "stripe" && paymentLink
      ? paymentLink
      : productCheckoutUrl(product.id, locale);

  return renderEmailOfferCard({
    title,
    description,
    price,
    imageUrl: product.image_url,
    href,
    cta: productCtaLabel(product, locale),
  });
}

export function expandEmailProductMarkers(
  html: string,
  productsById: Map<string, SiteProduct>,
  locale: "bg" | "en",
): string {
  return html.replace(
    new RegExp(PRODUCT_MARKER_RE.source, "gi"),
    (_match, id: string, mode: string | undefined) => {
      const product = productsById.get(id.toLowerCase());
      if (!product || !productSellableInLocale(product, locale)) return "";
      return renderEmailProductCard(product, locale, normalizeProductLinkMode(mode));
    },
  );
}
