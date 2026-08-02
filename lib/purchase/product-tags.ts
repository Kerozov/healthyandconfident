const PRODUCT_TAG_PREFIX = "product:";

/** Tag written on the subscriber for every paid product (see fulfillPurchase). */
export function productPurchaseTag(productId: string): string {
  return `${PRODUCT_TAG_PREFIX}${productId}`;
}

/** Product ids a subscriber already paid for, read back from their tags. */
export function purchasedProductIdsFromTags(tags: string[]): string[] {
  return tags
    .filter((tag) => tag.startsWith(PRODUCT_TAG_PREFIX))
    .map((tag) => tag.slice(PRODUCT_TAG_PREFIX.length))
    .filter(Boolean);
}
