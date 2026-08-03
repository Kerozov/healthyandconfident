import "server-only";

import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import { getStripe } from "@/lib/stripe/server";

export type ResolvedLineItem = {
  /** Internal site_products.id — null if only Stripe product / guide is known */
  internalProductId: string | null;
  /** Internal site_guides.id when this line is a guide purchase */
  internalGuideId: string | null;
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

async function loadCatalogMaps() {
  const supabase = getAdminClient();
  const [{ data: productData }, { data: guideData }] = await Promise.all([
    supabase.from("site_products").select("*"),
    supabase.from("site_guides").select("*"),
  ]);
  const products = (productData as SiteProduct[]) ?? [];
  const guides = (guideData as SiteGuide[]) ?? [];

  const productByPrice = new Map<string, SiteProduct>();
  const productByStripeProduct = new Map<string, SiteProduct>();
  for (const product of products) {
    const priceId = product.stripe_price_id?.trim();
    if (priceId) productByPrice.set(priceId, product);
    const prodId = product.stripe_product_id?.trim();
    if (prodId) productByStripeProduct.set(prodId, product);
  }

  const guideByPrice = new Map<string, SiteGuide>();
  for (const guide of guides) {
    const priceId = guide.stripe_price_id?.trim();
    if (priceId) guideByPrice.set(priceId, guide);
  }

  return { products, guides, productByPrice, productByStripeProduct, guideByPrice };
}

function lineFromProducts(
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
      internalGuideId: null,
      stripeProductId: stripeProductId || `internal:${product.id}`,
      stripePriceId: stripePriceId || "",
      amountCents,
      currency,
    });
  }

  return items;
}

function lineFromGuides(
  guideIds: string[],
  guides: SiteGuide[],
  amountCents: number | null,
  currency: string | null,
): ResolvedLineItem[] {
  const byId = new Map(guides.map((g) => [g.id, g]));
  const items: ResolvedLineItem[] = [];

  for (const id of guideIds) {
    const guide = byId.get(id);
    if (!guide) continue;
    const stripePriceId = guide.stripe_price_id?.trim();
    if (!stripePriceId) continue;
    items.push({
      internalProductId: null,
      internalGuideId: guide.id,
      stripeProductId: `guide:${guide.id}`,
      stripePriceId,
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
  const {
    products,
    guides,
    productByPrice,
    productByStripeProduct,
    guideByPrice,
  } = await loadCatalogMaps();

  const productIdsFromMeta = (session.metadata?.product_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const guideIdsFromMeta = (session.metadata?.guide_ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (productIdsFromMeta.length > 0 || guideIdsFromMeta.length > 0) {
    return [
      ...lineFromProducts(
        productIdsFromMeta,
        products,
        session.amount_total ?? null,
        session.currency ?? null,
      ),
      ...lineFromGuides(
        guideIdsFromMeta,
        guides,
        session.amount_total ?? null,
        session.currency ?? null,
      ),
    ];
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

    const product =
      productByPrice.get(stripePriceId) ??
      (stripeProductId ? productByStripeProduct.get(stripeProductId) : undefined) ??
      null;
    const guide = !product ? guideByPrice.get(stripePriceId) ?? null : null;

    resolved.push({
      internalProductId: product?.id ?? null,
      internalGuideId: guide?.id ?? null,
      stripeProductId:
        stripeProductId ||
        (guide ? `guide:${guide.id}` : `price:${stripePriceId}`),
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
