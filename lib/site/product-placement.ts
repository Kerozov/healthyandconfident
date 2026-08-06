export function productPlacementKey(productId: string): string {
  return `product_${productId}`;
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
  return `/${locale}/checkout/${productId}`;
}

export function isProductPlacementKey(key: string): boolean {
  return key.startsWith("product_");
}
