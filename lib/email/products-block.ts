import { publicSiteOrigin } from "@/lib/site";
import { productCheckoutPath } from "@/lib/site/product-placement";
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  const paymentLink = product.stripe_url?.trim() ?? "";
  // Falls back to the site page when the direct link is missing, so a product
  // set up with a Price ID only still shows up in the email.
  const href =
    mode === "stripe" && paymentLink
      ? paymentLink
      : productCheckoutUrl(product.id, locale);
  const cta = productCtaLabel(product, locale);

  const imageRow = product.image_url?.trim()
    ? `<tr>
  <td style="padding:0;line-height:0">
    <img src="${escapeHtml(product.image_url.trim())}" alt="${escapeHtml(title)}" width="544" style="display:block;width:100%;max-height:220px;object-fit:cover;border:0" />
  </td>
</tr>`
    : "";

  const priceRow = price.trim()
    ? `<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#2D7A47;line-height:1.2">${escapeHtml(price.trim())}</p>`
    : "";

  const descriptionBlock = description.trim()
    ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.55;color:#5A7A5A">${escapeHtml(description.trim())}</p>`
    : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid rgba(45,122,71,0.15);border-radius:14px;overflow:hidden;background-color:#FFFFFF">
${imageRow}
<tr>
  <td style="padding:20px 22px">
    ${priceRow}
    <h2 style="margin:${price.trim() ? "8px" : "0"} 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A2E1A;line-height:1.3">${escapeHtml(title)}</h2>
    ${descriptionBlock}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px">
      <tr>
        <td style="border-radius:10px;background-color:#F0B429">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1A2E1A;text-decoration:none">${escapeHtml(cta)}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>`;
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
      if (!product) return "";
      return renderEmailProductCard(product, locale, normalizeProductLinkMode(mode));
    },
  );
}
