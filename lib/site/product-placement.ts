/**
 * A catalogue row addressed inside a URL. The whole row is accepted so the
 * link uses its slug; a bare string stays valid because every link we ever
 * published carries the id, and those must keep resolving.
 */
export type CatalogPathRef = string | { id: string; slug?: string | null };

function refSegment(ref: CatalogPathRef): string {
  if (typeof ref === "string") return ref;
  return ref.slug?.trim() || ref.id;
}

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

export function guidePagePath(ref: CatalogPathRef, locale: "bg" | "en"): string {
  return `/${locale}/guides/${refSegment(ref)}`;
}

/**
 * Page that sells one product and runs its configured offer first. Every link
 * to a product — site pitches, emails, automations — goes through here so the
 * upsell cannot be bypassed, unless the product is set to link straight to
 * payment (see `lib/site/share-links.ts`).
 */
export function productCheckoutPath(
  ref: CatalogPathRef,
  locale: "bg" | "en",
): string {
  return `/${locale}/products/${refSegment(ref)}`;
}

export function isProductPlacementKey(key: string): boolean {
  return key.startsWith("product_");
}
