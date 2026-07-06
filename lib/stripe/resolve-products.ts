import "server-only";

import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import { getStripe } from "@/lib/stripe/server";

export async function resolveProductIdsFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ productIds: string[]; priceIds: string[] }> {
  const fromMeta = (session.metadata?.product_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (fromMeta.length > 0) {
    return { productIds: fromMeta, priceIds: [] };
  }

  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  });

  const priceIds = lineItems.data
    .map((item) => {
      const price = item.price;
      return typeof price === "string" ? price : price?.id;
    })
    .filter((id): id is string => Boolean(id));

  if (priceIds.length === 0) {
    return { productIds: [], priceIds: [] };
  }

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_products")
    .select("*")
    .in("stripe_price_id", priceIds);

  const products = (data as SiteProduct[]) ?? [];
  const byPrice = new Map(
    products
      .filter((p) => p.stripe_price_id?.trim())
      .map((p) => [p.stripe_price_id.trim(), p.id]),
  );

  const productIds = priceIds
    .map((priceId) => byPrice.get(priceId))
    .filter((id): id is string => Boolean(id));

  return { productIds: Array.from(new Set(productIds)), priceIds };
}
