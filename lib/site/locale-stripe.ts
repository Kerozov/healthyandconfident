import type { Locale } from "@/i18n/config";

export type StripeCheckout = {
  stripe_url: string;
  stripe_product_id: string;
  stripe_price_id: string;
};

export type LocaleStripeSource = {
  stripe_url?: string | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  stripe_url_en?: string | null;
  stripe_product_id_en?: string | null;
  stripe_price_id_en?: string | null;
};

function trimId(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function hasOwnCheckout(stripe: StripeCheckout): boolean {
  return Boolean(stripe.stripe_price_id || stripe.stripe_url);
}

export function localeStripeBg(row: LocaleStripeSource): StripeCheckout {
  return {
    stripe_url: trimId(row.stripe_url),
    stripe_product_id: trimId(row.stripe_product_id),
    stripe_price_id: trimId(row.stripe_price_id),
  };
}

export function localeStripeEnOnly(row: LocaleStripeSource): StripeCheckout {
  return {
    stripe_url: trimId(row.stripe_url_en),
    stripe_product_id: trimId(row.stripe_product_id_en),
    stripe_price_id: trimId(row.stripe_price_id_en),
  };
}

/**
 * Stripe IDs / Payment Link for a visitor locale.
 * English uses its own Stripe only when that locale has a Price ID or Payment
 * Link — never mixed field-by-field with BG.
 */
export function stripeForLocale(
  row: LocaleStripeSource,
  locale: Locale,
): StripeCheckout {
  const bg = localeStripeBg(row);
  if (locale !== "en") return bg;
  const en = localeStripeEnOnly(row);
  if (hasOwnCheckout(en)) return en;
  return bg;
}

export function visibleInLocale(
  enabled: boolean | undefined,
  enabledEn: boolean | undefined,
  locale: Locale,
): boolean {
  if (locale === "en") return enabledEn !== false;
  return enabled !== false;
}
