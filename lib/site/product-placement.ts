export function productPlacementKey(productId: string): string {
  return `product_${productId}`;
}

export function isProductPlacementKey(key: string): boolean {
  return key.startsWith("product_");
}
