import "server-only";

import type { Locale } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteCtaPlacement, SiteGuide, SiteProduct } from "@/lib/supabase/types";
import {
  productSellableInLocale,
  productStripeForLocale,
} from "@/lib/site/product-locale";
import {
  guideSellableInLocale,
  guideStripeForLocale,
} from "@/lib/site/guide-catalog";
import { placementStripeForLocale } from "@/lib/site/cta-placements";
import { getStripe } from "@/lib/stripe/server";

/** Checkout URL plus the amounts needed for ad-platform conversion events. */
export type CheckoutSessionResult = {
  url: string;
  amountCents: number | null;
  currency: string | null;
};

/** Pixel cookies carried through Stripe so the webhook can attribute the sale. */
export type CheckoutTracking = {
  fbp?: string | null;
  fbc?: string | null;
  userAgent?: string | null;
};

function trackingMetadata(tracking?: CheckoutTracking): Record<string, string> {
  const meta: Record<string, string> = {};
  if (tracking?.fbp) meta.fbp = tracking.fbp.slice(0, 200);
  if (tracking?.fbc) meta.fbc = tracking.fbc.slice(0, 400);
  if (tracking?.userAgent) meta.client_ua = tracking.userAgent.slice(0, 500);
  return meta;
}

function sessionAmount(
  session: { amount_total: number | null; currency: string | null },
  prices: { unit_amount: number | null; currency: string }[],
): { amountCents: number | null; currency: string | null } {
  if (session.amount_total != null) {
    return { amountCents: session.amount_total, currency: session.currency };
  }
  // Subscriptions leave amount_total empty until the first invoice.
  const sum = prices.reduce((total, price) => total + (price.unit_amount ?? 0), 0);
  return {
    amountCents: sum > 0 ? sum : null,
    currency: session.currency ?? prices[0]?.currency ?? null,
  };
}

export async function createGuideCheckoutSession(
  guideIds: string[],
  locale: Locale,
  contactId?: string,
  tracking?: CheckoutTracking,
): Promise<CheckoutSessionResult> {
  if (guideIds.length === 0) {
    throw new Error("No guides selected");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.from("site_guides").select("*").in("id", guideIds);

  if (error) throw new Error(error.message);

  const guides = (data as SiteGuide[]) ?? [];
  if (guides.length !== guideIds.length) {
    throw new Error("One or more guides were not found");
  }

  const byId = new Map(guides.map((g) => [g.id, g]));
  const ordered = guideIds.map((id) => byId.get(id)!);

  if (ordered.some((g) => !guideSellableInLocale(g, locale))) {
    throw new Error(
      locale === "en"
        ? "One of the guides is not available in this language."
        : "Едно от ръководствата не е налично за този език.",
    );
  }

  const priceIds = ordered.map((g) => guideStripeForLocale(g, locale).stripe_price_id);
  if (priceIds.some((id) => !id)) {
    throw new Error("Липсва Stripe Price ID на ръководството. Добави price_… в админ → Ръководства.");
  }

  const stripe = getStripe();
  const prices = await Promise.all(priceIds.map((id) => stripe.prices.retrieve(id)));
  const types = new Set(prices.map((p) => p.type));
  if (types.size > 1) {
    throw new Error("Не може да се комбинират абонамент и еднократно плащане в една сметка.");
  }

  const mode = prices[0].type === "recurring" ? "subscription" : "payment";
  const origin = publicSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: priceIds.map((price) => ({ price, quantity: 1 })),
    success_url: `${origin}/${locale}?checkout=success`,
    cancel_url: `${origin}/${locale}?checkout=cancelled`,
    locale: locale === "bg" ? "bg" : "en",
    metadata: {
      guide_ids: guideIds.join(","),
      locale,
      ...(contactId ? { contact_id: contactId } : {}),
      ...trackingMetadata(tracking),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, ...sessionAmount(session, prices) };
}

export async function createProductCheckoutSession(
  productIds: string[],
  locale: Locale,
  contactId?: string,
  tracking?: CheckoutTracking,
): Promise<CheckoutSessionResult> {
  if (productIds.length === 0) {
    throw new Error("No products selected");
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("site_products")
    .select("*")
    .in("id", productIds);

  if (error) throw new Error(error.message);

  const products = (data as SiteProduct[]) ?? [];
  if (products.length !== productIds.length) {
    throw new Error("One or more products were not found");
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = productIds.map((id) => byId.get(id)!);

  if (ordered.some((p) => !productSellableInLocale(p, locale))) {
    throw new Error(
      locale === "en"
        ? "One of the products is not available in this language."
        : "Един от продуктите не е наличен за този език.",
    );
  }

  const priceIds = ordered.map(
    (p) => productStripeForLocale(p, locale).stripe_price_id,
  );
  if (priceIds.some((id) => !id)) {
    throw new Error(
      "Липсва Stripe Price ID на един от продуктите. Добави price_… в админ → Оферти.",
    );
  }

  const stripe = getStripe();
  const prices = await Promise.all(priceIds.map((id) => stripe.prices.retrieve(id)));
  const types = new Set(prices.map((p) => p.type));
  if (types.size > 1) {
    throw new Error("Не може да се комбинират абонамент и еднократно плащане в една сметка.");
  }

  const mode = prices[0].type === "recurring" ? "subscription" : "payment";
  const origin = publicSiteOrigin();

  const stripeProductIds = ordered
    .map((p) => productStripeForLocale(p, locale).stripe_product_id)
    .filter(Boolean);

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: priceIds.map((price) => ({ price, quantity: 1 })),
    success_url: `${origin}/${locale}?checkout=success`,
    cancel_url: `${origin}/${locale}?checkout=cancelled`,
    locale: locale === "bg" ? "bg" : "en",
    metadata: {
      product_ids: productIds.join(","),
      stripe_product_ids: stripeProductIds.join(","),
      locale,
      ...(contactId ? { contact_id: contactId } : {}),
      ...trackingMetadata(tracking),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, ...sessionAmount(session, prices) };
}

export async function createPlacementCheckoutSession(
  placementKey: string,
  locale: Locale,
  contactId?: string,
  tracking?: CheckoutTracking,
): Promise<CheckoutSessionResult> {
  const key = placementKey.trim();
  if (!key) throw new Error("Missing button key");

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("site_cta_placements")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const placement = data as SiteCtaPlacement | null;
  if (!placement) throw new Error("Button was not found");

  const stripeIds = placementStripeForLocale(placement, locale);
  const priceId = stripeIds.stripe_price_id;
  if (!priceId) {
    throw new Error(
      "Липсва Stripe цена на бутона. Избери продукт от Stripe в админ → Бутони.",
    );
  }

  const stripe = getStripe();
  const price = await stripe.prices.retrieve(priceId);
  const mode = price.type === "recurring" ? "subscription" : "payment";
  const origin = publicSiteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/${locale}?checkout=success`,
    cancel_url: `${origin}/${locale}?checkout=cancelled`,
    locale: locale === "bg" ? "bg" : "en",
    metadata: {
      placement_key: key,
      stripe_product_ids: stripeIds.stripe_product_id,
      locale,
      ...(contactId ? { contact_id: contactId } : {}),
      ...trackingMetadata(tracking),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url, ...sessionAmount(session, [price]) };
}
