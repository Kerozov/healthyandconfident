import "server-only";

import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProduct } from "@/lib/supabase/types";
import { getStripe } from "@/lib/stripe/server";

export type ResolvedLineItem = {
  /** Internal site_products.id — null if only Stripe product is known */
  internalProductId: string | null;
  stripeProductId: string;
  stripePriceId: string;
  amountCents: number | null;
  currency: string | null;
};

function stripeProductIdFromPrice(price: Stripe.Price | string | null | undefined): string | null {
  if (!price || typeof price === "string") return null;
  const product = price.product;
  if (!product) return null;
  return typeof product === "string" ? product : product.id;
}

async function loadProductMaps() {
  const supabase = getAdminClient();
  const { data } = await supabase.from("site_products").select("*");
  const products = (data as SiteProduct[]) ?? [];

  const byPrice = new Map<string, SiteProduct>();
  const byProduct = new Map<string, SiteProduct>();

  for (const product of products) {
    const priceId = product.stripe_price_id?.trim();
    if (priceId) byPrice.set(priceId, product);
    const prodId = product.stripe_product_id?.trim();
    if (prodId) byProduct.set(prodId, product);
  }

  return { byPrice, byProduct, products };
}

function resolveInternalProduct(
  stripePriceId: string,
  stripeProductId: string | null,
  byPrice: Map<string, SiteProduct>,
  byProduct: Map<string, SiteProduct>,
): SiteProduct | null {
  const byPriceHit = byPrice.get(stripePriceId);
  if (byPriceHit) return byPriceHit;
  if (stripeProductId) {
    const byProdHit = byProduct.get(stripeProductId);
    if (byProdHit) return byProdHit;
  }
  return null;
}

function lineFromInternalIds(
  productIds: string[],
  products: SiteProduct[],
  amountCents: number | null,
  currency: string | null,
): ResolvedLineItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: ResolvedLineItem[] = [];

  for (const id of productIds) {
    const product = byId.get(id);
    if (!product) continue;
    const stripeProductId = product.stripe_product_id?.trim();
    const stripePriceId = product.stripe_price_id?.trim();
    if (!stripeProductId && !stripePriceId) continue;
    items.push({
      internalProductId: product.id,
      stripeProductId: stripeProductId || `internal:${product.id}`,
      stripePriceId: stripePriceId || "",
      amountCents,
      currency,
    });
  }

  return items;
}

/** Resolve paid line items from a Stripe Checkout Session. */
export async function resolveLineItemsFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<ResolvedLineItem[]> {
  const { byPrice, byProduct, products } = await loadProductMaps();

  const fromMeta = (session.metadata?.product_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (fromMeta.length > 0) {
    return lineFromInternalIds(
      fromMeta,
      products,
      session.amount_total ?? null,
      session.currency ?? null,
    );
  }

  const stripe = getStripe();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const resolved: ResolvedLineItem[] = [];

  for (const item of lineItems.data) {
    const price = item.price;
    const stripePriceId =
      typeof price === "string" ? price : price?.id ?? "";
    if (!stripePriceId) continue;

    let stripeProductId = stripeProductIdFromPrice(price);
    if (!stripeProductId && typeof price !== "string" && price) {
      const fullPrice = await stripe.prices.retrieve(stripePriceId, {
        expand: ["product"],
      });
      stripeProductId = stripeProductIdFromPrice(fullPrice);
    }

    const internal = resolveInternalProduct(
      stripePriceId,
      stripeProductId,
      byPrice,
      byProduct,
    );

    resolved.push({
      internalProductId: internal?.id ?? null,
      stripeProductId: stripeProductId || `price:${stripePriceId}`,
      stripePriceId,
      amountCents: item.amount_total ?? null,
      currency: item.currency ?? session.currency ?? null,
    });
  }

  return resolved;
}

/** @deprecated Use resolveLineItemsFromCheckoutSession */
export async function resolveProductIdsFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ productIds: string[]; priceIds: string[] }> {
  const items = await resolveLineItemsFromCheckoutSession(session);
  const productIds = items
    .map((i) => i.internalProductId)
    .filter((id): id is string => Boolean(id));
  const priceIds = items.map((i) => i.stripePriceId).filter(Boolean);
  return {
    productIds: Array.from(new Set(productIds)),
    priceIds,
  };
}
