import "server-only";

import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import type {
  StripeCatalogRow,
  StripePaymentLinkRow,
} from "@/lib/stripe/catalog-types";

export type { StripeCatalogRow, StripePaymentLinkRow } from "@/lib/stripe/catalog-types";

function formatStripeAmount(amount: number, currency: string): string {
  const value = amount / 100;
  const cur = currency.toLowerCase();
  if (cur === "eur") {
    const text = value % 1 === 0 ? String(value) : value.toFixed(2);
    return `€${text}`;
  }
  if (cur === "gbp") {
    return `£${value.toFixed(2)}`;
  }
  if (cur === "usd") {
    return `$${value.toFixed(2)}`;
  }
  return `${value.toFixed(2)} ${currency.toUpperCase()}`;
}

function priceLabelFromStripePrice(price: Stripe.Price | null | undefined): string {
  if (!price || price.unit_amount == null) return "";
  return formatStripeAmount(price.unit_amount, price.currency);
}

function defaultPriceId(product: Stripe.Product): string | null {
  const dp = product.default_price;
  if (!dp) return null;
  return typeof dp === "string" ? dp : dp.id;
}

function defaultPriceObject(product: Stripe.Product): Stripe.Price | null {
  const dp = product.default_price;
  if (!dp || typeof dp === "string") return null;
  return dp;
}

/** All Stripe products (active + inactive) for admin catalog. */
export async function listStripeCatalog(): Promise<StripeCatalogRow[]> {
  const stripe = getStripe();
  const rows: StripeCatalogRow[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.products.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.default_price"],
    });

    for (const product of page.data) {
      const stripePriceId = defaultPriceId(product);
      rows.push({
        stripeProductId: product.id,
        stripePriceId,
        name: product.name,
        description: product.description,
        imageUrl: product.images[0] ?? null,
        priceLabel: priceLabelFromStripePrice(defaultPriceObject(product)),
        active: product.active,
      });
    }

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "bg"));
}

export async function getStripeCatalogProduct(
  stripeProductId: string,
): Promise<StripeCatalogRow | null> {
  const prodId = stripeProductId.trim();
  if (!prodId.startsWith("prod_")) return null;

  const stripe = getStripe();
  const product = await stripe.products.retrieve(prodId, {
    expand: ["default_price"],
  });

  return {
    stripeProductId: product.id,
    stripePriceId: defaultPriceId(product),
    name: product.name,
    description: product.description,
    imageUrl: product.images[0] ?? null,
    priceLabel: priceLabelFromStripePrice(defaultPriceObject(product)),
    active: product.active,
  };
}

function paymentLinkName(
  link: Stripe.PaymentLink,
  price: Stripe.Price | null,
): string {
  const metaName =
    typeof link.metadata?.name === "string" ? link.metadata.name.trim() : "";
  if (metaName) return metaName;
  const product = price?.product;
  if (product && typeof product !== "string" && "name" in product) {
    const name = product.name?.trim();
    if (name) return name;
  }
  try {
    const host = new URL(link.url).pathname.replace(/^\//, "");
    return host || link.id;
  } catch {
    return link.id;
  }
}

/** Active Stripe Payment Links for admin pickers. */
export async function listStripePaymentLinks(): Promise<StripePaymentLinkRow[]> {
  const stripe = getStripe();
  const rows: StripePaymentLinkRow[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.paymentLinks.list({
      limit: 100,
      active: true,
      starting_after: startingAfter,
    });

    const details = await Promise.all(
      page.data.map(async (link) => {
        try {
          const items = await stripe.paymentLinks.listLineItems(link.id, {
            limit: 1,
            expand: ["data.price.product"],
          });
          const item = items.data[0];
          const price =
            item?.price && typeof item.price !== "string" ? item.price : null;
          const product = price?.product;
          const stripeProductId =
            typeof product === "string"
              ? product
              : product && "id" in product
                ? product.id
                : null;

          return {
            id: link.id,
            url: link.url,
            name: paymentLinkName(link, price),
            priceLabel: priceLabelFromStripePrice(price),
            stripeProductId,
            stripePriceId: price?.id ?? null,
            active: link.active,
          } satisfies StripePaymentLinkRow;
        } catch {
          return {
            id: link.id,
            url: link.url,
            name: paymentLinkName(link, null),
            priceLabel: "",
            stripeProductId: null,
            stripePriceId: null,
            active: link.active,
          } satisfies StripePaymentLinkRow;
        }
      }),
    );

    rows.push(...details);

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name, "bg"));
}
