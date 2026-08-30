import { publicSiteOrigin } from "@/lib/site";
import { productCheckoutPath } from "@/lib/site/product-placement";
import {
  productSellableInLocale,
  productStripeForLocale,
} from "@/lib/site/product-locale";
import { renderEmailOfferCard } from "@/lib/email/offer-card";
import { isStripeProductId } from "@/lib/stripe/parse-stripe-id";
import type { StripeCatalogRow } from "@/lib/stripe/catalog-types";
import type { SiteProduct } from "@/lib/supabase/types";

/**
 * Where a product card in an email sends the reader.
 *
 * `site` (the default) lands on the product page, which runs the upsell and
 * downsell configured for that product before handing over to Stripe — the
 * only path that also records the purchase against the subscriber.
 * `stripe` jumps straight to the product's Payment Link, skipping all of it.
 *
 * Markers may also store a Stripe Product id (`prod_…`) instead of a site
 * UUID — those always check out through Stripe and never hit the site page.
 */
export type EmailProductLinkMode = "site" | "stripe";

/** Site UUID or Stripe `prod_…` id captured from an email product marker. */
export const EMAIL_PRODUCT_ID_PATTERN =
  "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|prod_[A-Za-z0-9]+)";

const PRODUCT_MARKER_RE = new RegExp(
  `<!--\\s*hc-email-product:${EMAIL_PRODUCT_ID_PATTERN}(?::(site|stripe))?\\s*-->`,
  "gi",
);

export function productEmailMarker(
  productId: string,
  mode: EmailProductLinkMode = "site",
): string {
  if (isStripeProductId(productId)) {
    return `<!-- hc-email-product:${productId.trim()} -->`;
  }
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
    const id = match[1];
    if (id && !isStripeProductId(id)) ids.add(id.toLowerCase());
  }
  return [...ids];
}

export function extractStripeProductIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(new RegExp(PRODUCT_MARKER_RE.source, "gi"))) {
    const id = match[1];
    if (id && isStripeProductId(id)) ids.add(id);
  }
  return [...ids];
}

/** Click-time checkout for a Stripe catalog product (session is created on visit). */
export function stripeCatalogCheckoutUrl(
  stripeProductId: string,
  locale: "bg" | "en",
): string {
  return `${publicSiteOrigin()}/api/go/stripe/${encodeURIComponent(stripeProductId.trim())}?locale=${locale}`;
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

export function renderEmailStripeProductCard(
  product: StripeCatalogRow,
  locale: "bg" | "en",
): string {
  if (!product.active) return "";
  return renderEmailOfferCard({
    title: product.name,
    description: product.description ?? "",
    price: product.priceLabel,
    imageUrl: product.imageUrl,
    href: stripeCatalogCheckoutUrl(product.stripeProductId, locale),
    cta: locale === "en" ? "Buy now" : "Купи сега",
  });
}

export function expandEmailProductMarkers(
  html: string,
  productsById: Map<string, SiteProduct>,
  locale: "bg" | "en",
  stripeById: Map<string, StripeCatalogRow> = new Map(),
): string {
  return html.replace(
    new RegExp(PRODUCT_MARKER_RE.source, "gi"),
    (_match, id: string, mode: string | undefined) => {
      if (isStripeProductId(id)) {
        const stripeProduct = stripeById.get(id);
        if (!stripeProduct) return "";
        return renderEmailStripeProductCard(stripeProduct, locale);
      }
      const product = productsById.get(id.toLowerCase());
      if (!product || !productSellableInLocale(product, locale)) return "";
      return renderEmailProductCard(product, locale, normalizeProductLinkMode(mode));
    },
  );
}
