import type { SiteProduct } from "@/lib/supabase/types";

const PRODUCT_MARKER_RE =
  /<!--\s*hc-email-product:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*-->/gi;

export function productEmailMarker(productId: string): string {
  return `\n<!-- hc-email-product:${productId} -->\n`;
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
): string {
  const title = locale === "en" ? product.title_en : product.title_bg;
  const description =
    locale === "en" ? product.description_en : product.description_bg;
  const price =
    locale === "en" ? product.price_label_en : product.price_label_bg;
  const href = product.stripe_url?.trim() ?? "";
  const cta = productCtaLabel(product, locale);

  if (!href) return "";

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
  return html.replace(new RegExp(PRODUCT_MARKER_RE.source, "gi"), (_match, id: string) => {
    const product = productsById.get(id.toLowerCase());
    if (!product) return "";
    return renderEmailProductCard(product, locale);
  });
}
