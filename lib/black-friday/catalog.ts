import "server-only";

import { unstable_cache } from "next/cache";
import type { Locale } from "@/i18n/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import type {
  SiteCtaPlacement,
  SiteGuide,
  SiteProduct,
  SiteProgramCard,
} from "@/lib/supabase/types";
import {
  productSellableInLocale,
  productStripeForLocale,
  productVisibleInLocale,
} from "@/lib/site/product-locale";
import {
  guideSellableInLocale,
  guideStripeForLocale,
  guideVisibleInLocale,
} from "@/lib/site/guide-catalog";
import { placementStripeForLocale } from "@/lib/site/cta-placements";
import { findProgramCard } from "@/lib/site/program-purchase-tags";
import { guidePagePath, productCheckoutPath } from "@/lib/site/product-placement";
import { shortenProgramHref } from "@/lib/programs/types";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import { normalizeDisplayText } from "@/lib/site/typography";
import {
  blackFridayItemKey,
  type BlackFridayItemKind,
} from "@/lib/black-friday/pricing";

/** One thing the site sells, as Black Friday sees it. */
export type BlackFridayCatalogItem = {
  key: string;
  kind: BlackFridayItemKind;
  /** site_products.id, site_guides.id or the programme button's placement key. */
  ref: string;
  title: string;
  description: string;
  imageUrl: string | null;
  /** The item's own page on the site, when it has one. */
  href: string | null;
  /** What the admin picker shows — names the exact price for programmes. */
  adminLabel: string;
  /** Regular Stripe price for the locale; empty when none is attached. */
  priceId: string;
  /** Shown and sellable on the site in this locale. */
  available: boolean;
};

export type BlackFridayPrice = {
  unitAmount: number;
  currency: string;
  recurring: boolean;
  active: boolean;
  stripeProductId: string;
};

/** A catalog item whose Stripe price can carry a Black Friday discount. */
export type PricedCatalogItem = BlackFridayCatalogItem & {
  regularCents: number;
  stripeProductId: string;
};

/**
 * Stripe price facts, cached for a few minutes: amount and product never
 * change on a price, but it can be archived, and the page re-reads it per
 * view otherwise.
 */
const readPrice = unstable_cache(
  async (priceId: string): Promise<BlackFridayPrice | null> => {
    const price = await getStripe().prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    const product = typeof price.product === "string" ? price.product : price.product?.id;
    return {
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: Boolean(price.recurring),
      active: price.active,
      stripeProductId: product ?? "",
    };
  },
  ["black-friday-price"],
  { revalidate: 300, tags: ["black-friday-prices"] },
);

export async function readBlackFridayPrice(priceId: string): Promise<BlackFridayPrice | null> {
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) return null;
  try {
    return await readPrice(priceId);
  } catch (err) {
    console.warn(
      `[black-friday] price ${priceId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/** Why a price cannot be discounted, or null when it can. */
export function priceProblem(price: BlackFridayPrice | null, hasPriceId: boolean): string | null {
  if (!hasPriceId) return "няма Stripe цена";
  if (!price) return "цената не се чете от Stripe";
  if (!price.active) return "цената е архивирана в Stripe";
  if (price.recurring) return "абонамент - отстъпка само за еднократни плащания";
  if (price.currency.toLowerCase() !== "eur") return "цената не е в евро";
  if (price.unitAmount <= 0 || !price.stripeProductId) return "цената е 0";
  return null;
}

export async function priceCatalogItem(
  item: BlackFridayCatalogItem,
): Promise<PricedCatalogItem | null> {
  if (!item.priceId) return null;
  const price = await readBlackFridayPrice(item.priceId);
  if (priceProblem(price, true) || !price) return null;
  return { ...item, regularCents: price.unitAmount, stripeProductId: price.stripeProductId };
}

function pick(locale: Locale, bg: string | null | undefined, en: string | null | undefined): string {
  const value = locale === "en" ? en?.trim() || bg?.trim() : bg?.trim();
  return value ?? "";
}

function programHref(card: SiteProgramCard, locale: Locale): string | null {
  const raw = (locale === "en" ? card.href_en?.trim() || card.href : card.href)?.trim() ?? "";
  if (!raw) return null;
  const href = shortenProgramHref(raw);
  if (/^https?:\/\//i.test(href)) return href;
  if (!href.startsWith("/")) return null;
  return /^\/(bg|en)(\/|$)/.test(href) ? href : `/${locale}${href}`;
}

/** Card buttons first, then landing-page price buttons, then the rest. */
function placementRank(key: string, card: SiteProgramCard): number {
  if (key === card.placement_key) return 0;
  if (/_pricing_\d+$/.test(key)) return 1;
  return 2;
}

function productItems(products: SiteProduct[], locale: Locale): BlackFridayCatalogItem[] {
  return products.map((product) => ({
    key: blackFridayItemKey("product", product.id),
    kind: "product",
    ref: product.id,
    title: pick(locale, product.title_bg, product.title_en),
    description: pick(locale, product.description_bg, product.description_en),
    imageUrl: product.image_url,
    href: productCheckoutPath(product, locale),
    adminLabel: product.title_bg || product.title_en,
    priceId: productStripeForLocale(product, locale).stripe_price_id,
    available:
      productVisibleInLocale(product, locale) && productSellableInLocale(product, locale),
  }));
}

function guideItems(guides: SiteGuide[], locale: Locale): BlackFridayCatalogItem[] {
  return guides.map((guide) => ({
    key: blackFridayItemKey("guide", guide.id),
    kind: "guide",
    ref: guide.id,
    title: pick(locale, guide.title_bg, guide.title_en),
    description: pick(locale, guide.description_bg, guide.description_en),
    imageUrl: guide.image_url,
    href: guidePagePath(guide, locale),
    adminLabel: guide.title_bg || guide.title_en,
    priceId: guideStripeForLocale(guide, locale).stripe_price_id,
    available: guideVisibleInLocale(guide, locale) && guideSellableInLocale(guide, locale),
  }));
}

/**
 * A programme is sold from its card's pay buttons. Each distinct price of a
 * card becomes one item, named after the button that carries it.
 */
function programItems(
  cards: SiteProgramCard[],
  placements: SiteCtaPlacement[],
  locale: Locale,
): BlackFridayCatalogItem[] {
  const best = new Map<string, { placement: SiteCtaPlacement; card: SiteProgramCard; priceId: string }>();
  for (const placement of placements) {
    const priceId = placementStripeForLocale(placement, locale).stripe_price_id;
    if (!priceId) continue;
    const card = findProgramCard(placement.key, cards);
    if (!card) continue;
    const id = `${card.id}|${priceId}`;
    const current = best.get(id);
    if (
      !current ||
      placementRank(placement.key, card) < placementRank(current.placement.key, card)
    ) {
      best.set(id, { placement, card, priceId });
    }
  }

  return [...best.values()]
    .sort(
      (a, b) =>
        a.card.sort_order - b.card.sort_order ||
        placementRank(a.placement.key, a.card) - placementRank(b.placement.key, b.card) ||
        a.placement.key.localeCompare(b.placement.key),
    )
    .map(({ placement, card, priceId }) => ({
      key: blackFridayItemKey("program", placement.key),
      kind: "program" as const,
      ref: placement.key,
      title: pick(locale, card.title_bg, card.title_en),
      description: pick(locale, card.description_bg, card.description_en),
      imageUrl: card.image_url,
      href: programHref(card, locale),
      adminLabel: placement.label_bg?.trim() || card.title_bg,
      priceId,
      available: visibleInLocale(card.enabled, card.enabled_en, locale),
    }));
}

/** Everything the site sells, keyed by Black Friday item key. */
export async function getBlackFridayCatalog(
  locale: Locale,
): Promise<Map<string, BlackFridayCatalogItem>> {
  const supabase = getAdminClient();
  const [products, guides, cards, placements] = await Promise.all([
    supabase.from("site_products").select("*").order("sort_order", { ascending: true }),
    supabase.from("site_guides").select("*").order("sort_order", { ascending: true }),
    supabase.from("site_program_cards").select("*").order("sort_order", { ascending: true }),
    supabase.from("site_cta_placements").select("*"),
  ]);
  const failed = products.error ?? guides.error ?? cards.error ?? placements.error;
  if (failed) throw new Error(`[black-friday] catalog: ${failed.message}`);

  const items = normalizeDisplayText([
    ...productItems((products.data as SiteProduct[]) ?? [], locale),
    ...guideItems((guides.data as SiteGuide[]) ?? [], locale),
    ...programItems(
      (cards.data as SiteProgramCard[]) ?? [],
      (placements.data as SiteCtaPlacement[]) ?? [],
      locale,
    ),
  ]);
  return new Map(items.map((item) => [item.key, item]));
}
