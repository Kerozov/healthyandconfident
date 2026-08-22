import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";

export type ProductStripe = {
  stripe_url: string;
  stripe_product_id: string;
  stripe_price_id: string;
};

function trimId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasOwnCheckout(stripe: ProductStripe): boolean {
  return Boolean(stripe.stripe_price_id || stripe.stripe_url);
}

/** BG checkout fields — the product's primary Stripe attachment. */
export function productStripeBg(product: SiteProduct): ProductStripe {
  return {
    stripe_url: trimId(product.stripe_url),
    stripe_product_id: trimId(product.stripe_product_id),
    stripe_price_id: trimId(product.stripe_price_id),
  };
}

/** EN checkout fields only (no BG fallback). */
export function productStripeEnOnly(product: SiteProduct): ProductStripe {
  return {
    stripe_url: trimId(product.stripe_url_en),
    stripe_product_id: trimId(product.stripe_product_id_en),
    stripe_price_id: trimId(product.stripe_price_id_en),
  };
}

/**
 * Stripe IDs / Payment Link for a visitor locale.
 * English uses its own Stripe only when that locale has a Price ID or Payment
 * Link — never mixed field-by-field with BG (an EN Payment Link plus a BG
 * Price ID used to send English buyers to the Bulgarian Checkout).
 */
export function productStripeForLocale(
  product: SiteProduct,
  locale: Locale,
): ProductStripe {
  const bg = productStripeBg(product);
  if (locale !== "en") return bg;

  const en = productStripeEnOnly(product);
  if (hasOwnCheckout(en)) return en;
  return bg;
}

export function productHasStripePrice(
  product: SiteProduct,
  locale?: Locale,
): boolean {
  if (locale) {
    return Boolean(productStripeForLocale(product, locale).stripe_price_id);
  }
  return Boolean(
    trimId(product.stripe_price_id) || trimId(product.stripe_price_id_en),
  );
}

export function productHasCheckoutForLocale(
  product: SiteProduct,
  locale: Locale,
): boolean {
  const stripe = productStripeForLocale(product, locale);
  return Boolean(stripe.stripe_price_id || stripe.stripe_url);
}

/**
 * Can this product be sold in this locale (email, checkout page, API)?
 * Shop visibility (`enabled`) is separate — a product can stay out of the
 * shop grid and still be bought from an email or a direct checkout link.
 * `enabled_en === false` hides the English sale everywhere.
 */
export function productSellableInLocale(
  product: SiteProduct,
  locale: Locale,
): boolean {
  if (locale === "en" && product.enabled_en === false) return false;
  return productHasCheckoutForLocale(product, locale);
}

export function productCanBeBought(
  product: SiteProduct,
  locale: Locale,
): boolean {
  if (!productVisibleInLocale(product, locale)) return false;
  return productHasCheckoutForLocale(product, locale);
}

/** Shop / checkout / EN emails: hidden when the whole product or the EN version is off. */
export function productVisibleInLocale(
  product: SiteProduct,
  locale: Locale,
): boolean {
  if (!product.enabled) return false;
  if (locale === "en" && product.enabled_en === false) return false;
  return true;
}

export function filterProductsForLocale(
  products: SiteProduct[],
  locale: Locale,
): SiteProduct[] {
  return products.filter((product) => productVisibleInLocale(product, locale));
}
