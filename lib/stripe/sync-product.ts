import "server-only";

import { getStripe } from "@/lib/stripe/server";

/** Fetch Stripe Product default_price as price_… id. */
export async function resolveDefaultPriceFromStripeProduct(
  stripeProductId: string,
): Promise<string | null> {
  const prodId = stripeProductId.trim();
  if (!prodId.startsWith("prod_")) return null;

  const stripe = getStripe();
  const product = await stripe.products.retrieve(prodId);
  const defaultPrice = product.default_price;
  if (!defaultPrice) return null;
  return typeof defaultPrice === "string" ? defaultPrice : defaultPrice.id;
}

/** Fill stripe_price_id from Stripe default_price when product id is set. */
export async function enrichStripePriceFromProduct(input: {
  stripe_product_id?: string;
  stripe_price_id?: string;
}): Promise<{ stripe_product_id: string; stripe_price_id: string }> {
  const stripeProductId = input.stripe_product_id?.trim() ?? "";
  let stripePriceId = input.stripe_price_id?.trim() ?? "";

  if (stripeProductId && !stripePriceId) {
    const defaultPrice = await resolveDefaultPriceFromStripeProduct(stripeProductId);
    if (defaultPrice) stripePriceId = defaultPrice;
  }

  return {
    stripe_product_id: stripeProductId,
    stripe_price_id: stripePriceId,
  };
}
