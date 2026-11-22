import "server-only";

import { getSegments } from "@/lib/admin/data";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  BlackFridayBundle,
  BlackFridayDiscount,
  Segment,
  SiteBlackFridayConfig,
} from "@/lib/supabase/types";
import { getAdminBlackFridayConfig } from "@/lib/black-friday/config";
import {
  blackFridayRegularCents,
  getBlackFridayCatalog,
  priceProblem,
  readBlackFridayPrice,
  type BlackFridayCatalogItem,
} from "@/lib/black-friday/catalog";
import type { BlackFridayItemKind } from "@/lib/black-friday/pricing";

/** A catalog item in the admin picker, with its Bulgarian Stripe price. */
export type BlackFridayAdminItem = {
  key: string;
  kind: BlackFridayItemKind;
  label: string;
  title: string;
  priceId: string;
  stripeProductId: string;
  /** Regular price in cents; null when Stripe gives no usable one. */
  regularCents: number | null;
  /** Why this item cannot carry a discount right now, or null. */
  problem: string | null;
};

export type BlackFridayAdminData = {
  config: SiteBlackFridayConfig | null;
  purchaseGroups: Pick<Segment, "key" | "name">[];
  discounts: BlackFridayDiscount[];
  bundles: BlackFridayBundle[];
  items: BlackFridayAdminItem[];
  /** Set when the 096 tables are not in the database yet. */
  tablesError: string | null;
};

/** One item with its price checked — shared by the screen and the save actions. */
export async function adminItem(item: BlackFridayCatalogItem): Promise<BlackFridayAdminItem> {
  const price = item.priceId ? await readBlackFridayPrice(item.priceId) : null;
  const problem = !item.available
    ? "скрит на сайта"
    : priceProblem(price, Boolean(item.priceId));
  return {
    key: item.key,
    kind: item.kind,
    label: item.adminLabel,
    title: item.title,
    priceId: item.priceId,
    stripeProductId: price?.stripeProductId ?? "",
    regularCents: price && !problem ? blackFridayRegularCents(item.key, price.unitAmount) : null,
    problem,
  };
}

/** Every catalog item of the Bulgarian site, priced, keyed by item key. */
export async function getBlackFridayAdminItems(): Promise<Map<string, BlackFridayAdminItem>> {
  const catalog = await getBlackFridayCatalog("bg");
  const items = await Promise.all([...catalog.values()].map(adminItem));
  return new Map(items.map((item) => [item.key, item]));
}

export async function getBlackFridayAdminData(): Promise<BlackFridayAdminData> {
  const supabase = getAdminClient();
  const [config, discounts, bundles, items, segments] = await Promise.all([
    getAdminBlackFridayConfig(),
    supabase
      .from("black_friday_discounts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("black_friday_bundles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    getBlackFridayAdminItems(),
    getSegments(),
  ]);

  return {
    config,
    purchaseGroups: segments.map(({ key, name }) => ({ key, name })),
    discounts: ((discounts.data as BlackFridayDiscount[]) ?? []).map((row) => ({
      ...row,
      discount_value: Number(row.discount_value),
    })),
    bundles: ((bundles.data as BlackFridayBundle[]) ?? []).map((row) => ({
      ...row,
      item_keys: row.item_keys ?? [],
      price_value: Number(row.price_value),
    })),
    items: [...items.values()],
    tablesError: discounts.error?.message ?? bundles.error?.message ?? null,
  };
}
