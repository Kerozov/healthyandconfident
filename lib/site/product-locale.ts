import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import {
  hasOwnCheckout,
  localeStripeBg,
  localeStripeEnOnly,
  stripeForLocale,
  visibleInLocale,
  type StripeCheckout,
} from "@/lib/site/locale-stripe";

export type ProductStripe = StripeCheckout;

/** BG checkout fields — the product's primary Stripe attachment. */
export function productStripeBg(product: SiteProduct): ProductStripe {
  return localeStripeBg(product);
}

/** EN checkout fields only (no BG fallback). */
export function productStripeEnOnly(product: SiteProduct): ProductStripe {
  return localeStripeEnOnly(product);
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
  return stripeForLocale(product, locale);
}

export function productHasStripePrice(
  product: SiteProduct,
  locale?: Locale,
): boolean {
  if (locale) {
    return Boolean(productStripeForLocale(product, locale).stripe_price_id);
  }
  return Boolean(
    productStripeBg(product).stripe_price_id ||
      productStripeEnOnly(product).stripe_price_id,
  );
}

export function productHasCheckoutForLocale(
  product: SiteProduct,
  locale: Locale,
): boolean {
  return hasOwnCheckout(productStripeForLocale(product, locale));
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

/** Shop / checkout / EN emails: hidden independently per language. */
export function productVisibleInLocale(
  product: SiteProduct,
  locale: Locale,
): boolean {
  return visibleInLocale(product.enabled, product.enabled_en, locale);
}

export function filterProductsForLocale(
  products: SiteProduct[],
  locale: Locale,
): SiteProduct[] {
  return products.filter((product) => productVisibleInLocale(product, locale));
}
