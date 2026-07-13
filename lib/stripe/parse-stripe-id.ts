/** Parse admin input: price_… or prod_… (default price resolved on save). */
export function parseStripeIdInput(value: string): {
  stripe_product_id: string;
  stripe_price_id: string;
} {
  const trimmed = value.trim();
  if (trimmed.startsWith("price_")) {
    return { stripe_product_id: "", stripe_price_id: trimmed };
  }
  if (trimmed.startsWith("prod_")) {
    return { stripe_product_id: trimmed, stripe_price_id: "" };
  }
  return { stripe_product_id: "", stripe_price_id: trimmed };
}

export function formatStripeIdInput(input: {
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
}): string {
  return input.stripe_price_id?.trim() || input.stripe_product_id?.trim() || "";
}

export function isValidStripeIdInput(value: string): boolean {
  const v = value.trim();
  return v.startsWith("price_") || v.startsWith("prod_");
}
