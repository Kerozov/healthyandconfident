import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  SiteEvent,
  SiteProduct,
  SiteSection,
  SiteCtaPlacement,
  Segment,
  SiteVideo,
  SiteGuide,
  SiteProgramCard,
} from "@/lib/supabase/types";
import type { Locale } from "@/i18n/config";
import { mergeSiteSections, type SiteContent } from "@/lib/site/defaults";
import { stripeForLocale } from "@/lib/site/locale-stripe";
import { placementStripeForLocale } from "@/lib/site/cta-placements";
import { programCardForLocale } from "@/lib/site/program-cards";
import { withLivePrice } from "@/lib/site/price-format";
import { getLivePrices } from "@/lib/stripe/live-prices";
import { resolveProgramSlug } from "@/lib/programs/types";
import { getProgramLanding } from "@/lib/programs/landings";
import { programPricingPriceIds } from "@/lib/programs/prices";

export type { SiteContent };

function indexOffers(products: SiteProduct[]): Record<string, SiteProduct> {
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

function indexPlacements(rows: SiteCtaPlacement[]): Record<string, SiteCtaPlacement> {
  return Object.fromEntries(rows.map((p) => [p.key, p]));
}

/**
 * Shop products and guides quote the Stripe price they are sold at. The price
 * label typed in the admin is a copy that goes stale the moment the Stripe
 * price is swapped, so its amount is replaced with the live one.
 */
async function withLivePriceLabels<T extends SiteProduct | SiteGuide>(rows: T[]): Promise<T[]> {
  const priceIds = (row: T) =>
    [stripeForLocale(row, "bg").stripe_price_id, stripeForLocale(row, "en").stripe_price_id] as const;
  const live = await getLivePrices(rows.flatMap((row) => priceIds(row)));
  return rows.map((row) => {
    const [bg, en] = priceIds(row);
    return {
      ...row,
      price_label_bg: withLivePrice(row.price_label_bg, live[bg], "bg"),
      price_label_en: withLivePrice(row.price_label_en, live[en], "en"),
    };
  });
}

const PROGRAM_PAGE_HREF = /^(?:\/(?:bg|en))?\/programs\/([^/?#]+)/i;

/**
 * The Stripe price a programme card sells: its own button's, or — when that
 * button only links to the programme page — the first price on that page.
 */
function programCardPriceId(
  card: SiteProgramCard,
  placements: Record<string, SiteCtaPlacement>,
  locale: Locale,
): string {
  const own = placementStripeForLocale(placements[card.placement_key], locale).stripe_price_id;
  if (own) return own;
  const segment = PROGRAM_PAGE_HREF.exec(programCardForLocale(card, locale).href.trim())?.[1];
  const programId = segment ? resolveProgramSlug(segment) : null;
  const landing = programId ? getProgramLanding(locale, programId) : null;
  return landing ? (programPricingPriceIds(landing, placements, locale)[0] ?? "") : "";
}

async function withLiveCardPrices(
  cards: SiteProgramCard[],
  placements: Record<string, SiteCtaPlacement>,
): Promise<SiteProgramCard[]> {
  const priceIds = (card: SiteProgramCard) =>
    [programCardPriceId(card, placements, "bg"), programCardPriceId(card, placements, "en")] as const;
  const live = await getLivePrices(cards.flatMap((card) => priceIds(card)));
  return cards.map((card) => {
    const [bg, en] = priceIds(card);
    return {
      ...card,
      // An empty card price stays empty: English falls back to the Bulgarian
      // text, and a card may leave the price out on purpose.
      price_bg: withLivePrice(card.price_bg, live[bg], "bg", { fillEmpty: false }),
      price_en: withLivePrice(card.price_en, live[en], "en", { fillEmpty: false }),
    };
  });
}

/** Missing env must not crash `next build` / SSG — same pattern as `lib/blog.ts`. */
async function withPublicClient<T>(
  run: (client: ReturnType<typeof getPublicClient>) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run(getPublicClient());
  } catch {
    return fallback;
  }
}

export async function getSiteSegments(): Promise<Segment[]> {
  return withPublicClient(async (supabase) => {
    const { data } = await supabase.from("segments").select("*").order("name");
    return (data as Segment[]) ?? [];
  }, []);
}

export async function getCtaPlacements(): Promise<SiteCtaPlacement[]> {
  return withPublicClient(async (supabase) => {
    const { data } = await supabase.from("site_cta_placements").select("*").order("key");
    return (data as SiteCtaPlacement[]) ?? [];
  }, []);
}

export async function getSiteSections(): Promise<SiteSection[]> {
  return withPublicClient(async (supabase) => {
    const { data } = await supabase.from("site_sections").select("*").order("key");
    return (data as SiteSection[]) ?? [];
  }, []);
}

export async function getSiteEvents(includeDisabled = false): Promise<SiteEvent[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_events")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteEvent[]) ?? [];
  }, []);
}

export async function getSiteProducts(includeDisabled = false): Promise<SiteProduct[]> {
  return withLivePriceLabels(await readSiteProducts(includeDisabled));
}

async function readSiteProducts(includeDisabled: boolean): Promise<SiteProduct[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteProduct[]) ?? [];
  }, []);
}

export async function getSiteGuides(includeDisabled = false): Promise<SiteGuide[]> {
  return withLivePriceLabels(await readSiteGuides(includeDisabled));
}

async function readSiteGuides(includeDisabled: boolean): Promise<SiteGuide[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_guides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteGuide[]) ?? [];
  }, []);
}

export async function getSiteVideos(includeDisabled = false): Promise<SiteVideo[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_videos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteVideo[]) ?? [];
  }, []);
}

export async function getSiteProgramCards(includeDisabled = false): Promise<SiteProgramCard[]> {
  const [cards, placements] = await Promise.all([
    readSiteProgramCards(includeDisabled),
    getCtaPlacements(),
  ]);
  return withLiveCardPrices(cards, indexPlacements(placements));
}

async function readSiteProgramCards(includeDisabled: boolean): Promise<SiteProgramCard[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_program_cards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteProgramCard[]) ?? [];
  }, []);
}

export async function getPublicSiteContent(): Promise<SiteContent> {
  const [sections, events, products, guides, videos, programCards, placements, segments] =
    await Promise.all([
      getSiteSections(),
      getSiteEvents(),
      getSiteProducts(),
      getSiteGuides(),
      getSiteVideos(),
      readSiteProgramCards(false),
      getCtaPlacements(),
      getSiteSegments(),
    ]);

  const sectionMap = mergeSiteSections(sections);
  const offersById = indexOffers(products);
  const ctaPlacements = indexPlacements(placements);

  return {
    sections: sectionMap,
    events: sectionMap.events?.enabled ? events : [],
    products: sectionMap.products?.enabled ? products : [],
    guides: sectionMap.guides?.enabled ? guides : [],
    videos: sectionMap.videos?.enabled ? videos : [],
    // The Programs section falls back to the dictionary when the table is
    // empty, so its own toggle is read by the page, not applied here.
    programCards: await withLiveCardPrices(programCards, ctaPlacements),
    offersById,
    ctaPlacements,
    segments,
    dbReady: true,
  };
}

export async function getAdminSiteContent(): Promise<SiteContent> {
  const supabase = getAdminClient();
  const [
    sectionsRes,
    eventsRes,
    productsRes,
    guidesRes,
    videosRes,
    programCardsRes,
    placementsRes,
    segmentsRes,
  ] = await Promise.all([
    supabase.from("site_sections").select("*").order("key"),
    supabase
      .from("site_events")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("site_products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("site_guides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("site_videos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("site_program_cards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("site_cta_placements").select("*").order("key"),
    supabase.from("segments").select("*").order("name"),
  ]);

  const dbError =
    sectionsRes.error?.message ??
    eventsRes.error?.message ??
    productsRes.error?.message ??
    guidesRes.error?.message ??
    videosRes.error?.message ??
    programCardsRes.error?.message ??
    placementsRes.error?.message ??
    segmentsRes.error?.message;

  const products = (productsRes.data as SiteProduct[]) ?? [];

  return {
    sections: mergeSiteSections((sectionsRes.data as SiteSection[]) ?? []),
    events: (eventsRes.data as SiteEvent[]) ?? [],
    products,
    guides: (guidesRes.data as SiteGuide[]) ?? [],
    videos: (videosRes.data as SiteVideo[]) ?? [],
    programCards: (programCardsRes.data as SiteProgramCard[]) ?? [],
    offersById: indexOffers(products),
    ctaPlacements: indexPlacements((placementsRes.data as SiteCtaPlacement[]) ?? []),
    segments: (segmentsRes.data as Segment[]) ?? [],
    dbReady: !dbError,
    dbError,
  };
}
