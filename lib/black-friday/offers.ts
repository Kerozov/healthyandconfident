import "server-only";

import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { getAdminClient } from "@/lib/supabase/admin";
import type { BlackFridayBundle, BlackFridayDiscount } from "@/lib/supabase/types";
import {
  getBlackFridayCatalog,
  priceCatalogItem,
  type BlackFridayCatalogItem,
  type PricedCatalogItem,
} from "@/lib/black-friday/catalog";
import {
  allocateBundleAmounts,
  bundleFinalAmount,
  discountedAmount,
  savedPercent,
  type BlackFridayItemKind,
} from "@/lib/black-friday/pricing";

/** One discounted item, priced to the cent from its Stripe price. */
export type BlackFridayOffer = {
  key: string;
  kind: BlackFridayItemKind;
  ref: string;
  title: string;
  description: string;
  imageUrl: string | null;
  href: string | null;
  priceId: string;
  stripeProductId: string;
  regularCents: number;
  finalCents: number;
  savedPercent: number;
};

export type BlackFridayBundleItem = {
  key: string;
  kind: BlackFridayItemKind;
  ref: string;
  title: string;
  imageUrl: string | null;
  href: string | null;
  priceId: string;
  stripeProductId: string;
  regularCents: number;
  /** This item's share of the bundle price — its own line in Checkout. */
  lineCents: number;
};

export type BlackFridayBundleOffer = {
  id: string;
  title: string;
  description: string;
  badge: string;
  items: BlackFridayBundleItem[];
  regularCents: number;
  finalCents: number;
  savedPercent: number;
};

const getCatalog = cache((locale: Locale) => getBlackFridayCatalog(locale));

function numeric<T extends { [key: string]: unknown }>(row: T, field: keyof T): T {
  return { ...row, [field]: Number(row[field]) };
}

const getEnabledDiscounts = cache(async (): Promise<BlackFridayDiscount[]> => {
  const { data, error } = await getAdminClient()
    .from("black_friday_discounts")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[black-friday] discounts:", error.message);
    return [];
  }
  return ((data as BlackFridayDiscount[]) ?? []).map((row) => numeric(row, "discount_value"));
});

const getEnabledBundles = cache(async (): Promise<BlackFridayBundle[]> => {
  const { data, error } = await getAdminClient()
    .from("black_friday_bundles")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[black-friday] bundles:", error.message);
    return [];
  }
  return ((data as BlackFridayBundle[]) ?? []).map((row) => numeric(row, "price_value"));
});

async function priced(
  catalog: Map<string, BlackFridayCatalogItem>,
  key: string,
): Promise<PricedCatalogItem | null> {
  const item = catalog.get(key);
  if (!item?.available) return null;
  return priceCatalogItem(item);
}

/** Discounted items for one language, in admin order, one per Stripe price. */
export const getBlackFridayOffers = cache(async (locale: Locale): Promise<BlackFridayOffer[]> => {
  const discounts = await getEnabledDiscounts();
  if (discounts.length === 0) return [];
  const catalog = await getCatalog(locale);

  const offers = await Promise.all(
    discounts.map(async (discount): Promise<BlackFridayOffer | null> => {
      const item = await priced(catalog, discount.item_key);
      if (!item) return null;
      const finalCents = discountedAmount(
        item.regularCents,
        discount.discount_type,
        discount.discount_value,
      );
      if (finalCents === null) return null;
      return {
        key: item.key,
        kind: item.kind,
        ref: item.ref,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        href: item.href,
        priceId: item.priceId,
        stripeProductId: item.stripeProductId,
        regularCents: item.regularCents,
        finalCents,
        savedPercent: savedPercent(item.regularCents, finalCents),
      };
    }),
  );

  const seenPrices = new Set<string>();
  return offers.filter((offer): offer is BlackFridayOffer => {
    if (!offer || seenPrices.has(offer.priceId)) return false;
    seenPrices.add(offer.priceId);
    return true;
  });
});

/**
 * A bundle is shown only whole: when one of its items is hidden or its Stripe
 * price stops qualifying, the bundle disappears rather than selling without it.
 */
async function resolveBundle(
  bundle: BlackFridayBundle,
  catalog: Map<string, BlackFridayCatalogItem>,
  locale: Locale,
): Promise<BlackFridayBundleOffer | null> {
  const title = (locale === "en" ? bundle.title_en : bundle.title_bg)?.trim() ?? "";
  if (!title) return null;
  const keys = bundle.item_keys ?? [];
  if (keys.length < 2 || new Set(keys).size !== keys.length) return null;

  const items = await Promise.all(keys.map((key) => priced(catalog, key)));
  if (items.some((item) => !item)) {
    console.warn(`[black-friday] bundle „${bundle.title_bg}“ hidden (${locale}): an item is not sellable`);
    return null;
  }
  const ready = items as PricedCatalogItem[];
  if (
    new Set(ready.map((item) => item.priceId)).size !== ready.length ||
    new Set(ready.map((item) => item.stripeProductId)).size !== ready.length
  ) {
    return null;
  }

  const regularCents = ready.reduce((sum, item) => sum + item.regularCents, 0);
  const finalCents = bundleFinalAmount(regularCents, ready.length, bundle.price_type, bundle.price_value);
  if (finalCents === null) return null;
  const shares = allocateBundleAmounts(
    ready.map((item) => item.regularCents),
    finalCents,
  );

  return {
    id: bundle.id,
    title,
    description: (locale === "en" ? bundle.description_en : bundle.description_bg)?.trim() ?? "",
    badge: (locale === "en" ? bundle.badge_en : bundle.badge_bg)?.trim() ?? "",
    items: ready.map((item, index) => ({
      key: item.key,
      kind: item.kind,
      ref: item.ref,
      title: item.title,
      imageUrl: item.imageUrl,
      href: item.href,
      priceId: item.priceId,
      stripeProductId: item.stripeProductId,
      regularCents: item.regularCents,
      lineCents: shares[index],
    })),
    regularCents,
    finalCents,
    savedPercent: savedPercent(regularCents, finalCents),
  };
}

export const getBlackFridayBundleOffers = cache(
  async (locale: Locale): Promise<BlackFridayBundleOffer[]> => {
    const bundles = await getEnabledBundles();
    if (bundles.length === 0) return [];
    const catalog = await getCatalog(locale);
    const resolved = await Promise.all(
      bundles.map((bundle) => resolveBundle(bundle, catalog, locale)),
    );
    return resolved.filter((offer): offer is BlackFridayBundleOffer => Boolean(offer));
  },
);
