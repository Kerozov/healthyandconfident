import "server-only";

import type { Locale } from "@/i18n/config";
import { siteConfig } from "@/lib/site";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import { getStripe } from "@/lib/stripe/server";

export async function createProductCheckoutSession(
  productIds: string[],
  locale: Locale,
): Promise<string> {
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

  const priceIds = ordered.map((p) => p.stripe_price_id?.trim() ?? "");
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteConfig.domain;

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: priceIds.map((price) => ({ price, quantity: 1 })),
    success_url: `${origin}/${locale}?checkout=success`,
    cancel_url: `${origin}/${locale}?checkout=cancelled`,
    locale: locale === "bg" ? "bg" : "en",
    metadata: {
      product_ids: productIds.join(","),
      locale,
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}
