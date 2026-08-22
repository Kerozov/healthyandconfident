export function productPlacementKey(productId: string): string {
  return `product_${productId}`;
}

export function productsListPath(locale: "bg" | "en"): string {
  return `/${locale}/products`;
}

export function guidesListPath(locale: "bg" | "en"): string {
  return `/${locale}/guides`;
}

export function programsListPath(locale: "bg" | "en"): string {
  return `/${locale}/programs`;
}

export function guidePagePath(guideId: string, locale: "bg" | "en"): string {
  return `/${locale}/guides/${guideId}`;
}

/**
 * Page that sells one product and runs its configured offer first. Every link
 * to a product — site pitches, emails, automations — goes through here so the
 * upsell cannot be bypassed.
 */
export function productCheckoutPath(
  productId: string,
  locale: "bg" | "en",
): string {
  return `/${locale}/products/${productId}`;
}

export function isProductPlacementKey(key: string): boolean {
  return key.startsWith("product_");
}
