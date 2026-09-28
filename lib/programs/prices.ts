import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement } from "@/lib/supabase/types";
import type { ProgramFallbackPrice, ProgramLandingContent } from "@/lib/programs/types";
import {
  placementStripeForLocale,
  programPricingPlacementKey,
} from "@/lib/site/cta-placements";
import {
  DAYS_PER_MONTH,
  formatCents,
  monthlyCents,
  priceAmount,
  priceWithPeriod,
  type LivePrice,
} from "@/lib/site/price-format";

/** The key a programme page's buttons are named after — `programs_1`, `product_<slug>`. */
export function programPlacementKey(content: ProgramLandingContent): string {
  return content.hero.placementKey ?? `product_${content.slug}`;
}

/** The Stripe price behind each price card, in card order — `""` when not wired. */
export function programPricingPriceIds(
  content: ProgramLandingContent,
  placements: Record<string, SiteCtaPlacement>,
  locale: Locale,
): string[] {
  const base = programPlacementKey(content);
  return (content.pricing?.options ?? []).map(
    (_, i) =>
      placementStripeForLocale(placements[programPricingPlacementKey(base, i)], locale)
        .stripe_price_id,
  );
}

function fromFallback(price: ProgramFallbackPrice): LivePrice {
  return {
    unitAmount: Math.round(price.amount * 100),
    currency: price.currency ?? "eur",
    recurring: price.interval
      ? { interval: price.interval, intervalCount: price.intervalCount ?? 1 }
      : null,
  };
}

/**
 * `{kind}`, `{kind:arg}`, `{kind@card}`, `{kind@card:arg}` — see
 * `ProgramLandingContent["pricing"]`.
 *
 * - `amount` — „180 €“
 * - `price` — with the billing period, „38 €/месец“
 * - `monthly` — per month whatever Stripe bills in, „28 €“
 * - `total:12` — what 12 months come to („336 €“); a one-off price as is
 * - `perday:90` — per day, rounded down to 10 cents; a subscription is spread
 *   over its month, a one-off price over the given number of days
 * - `off:152` — percent saved against 152 (same currency); `off:@0` —
 *   percent saved per month against card 0
 */
const TOKEN = /\{(amount|price|monthly|total|perday|off)(?:@(\d+))?(?::([^}]*))?\}/g;

function fillTokens(
  text: string,
  prices: LivePrice[],
  ownCard: number,
  locale: Locale,
): string {
  return text.replace(TOKEN, (whole, kind: string, card?: string, arg?: string) => {
    const price = prices[card === undefined ? ownCard : Number(card)];
    if (!price) return whole;
    const money = (cents: number) => formatCents(cents, price.currency, locale);

    switch (kind) {
      case "amount":
        return priceAmount(price, locale);
      case "price":
        return priceWithPeriod(price, locale);
      case "monthly":
        return money(monthlyCents(price));
      case "total": {
        const months = Number(arg) || 1;
        return money(price.recurring ? monthlyCents(price) * months : price.unitAmount);
      }
      case "perday": {
        const cents = price.recurring
          ? monthlyCents(price) / DAYS_PER_MONTH
          : price.unitAmount / (Number(arg) || 30);
        return money(Math.floor(cents / 10) * 10);
      }
      case "off": {
        let share: number;
        if (arg?.startsWith("@")) {
          const other = prices[Number(arg.slice(1))];
          if (!other) return whole;
          share = monthlyCents(price) / monthlyCents(other);
        } else {
          const anchor = Number(arg?.replace(",", "."));
          if (!anchor) return whole;
          share = price.unitAmount / (anchor * 100);
        }
        return String(Math.max(0, Math.round((1 - share) * 100)));
      }
      default:
        return whole;
    }
  });
}

function fillDeep<T>(value: T, fill: (text: string) => string): T {
  if (typeof value === "string") return fill(value) as T;
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, fill)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fillDeep(item, fill)]),
    ) as T;
  }
  return value;
}

/**
 * The page with every price placeholder replaced — by the Stripe price of the
 * card's button, or the card's `fallbackPrice` while that button has none.
 */
export function fillProgramPrices(
  content: ProgramLandingContent,
  livePrices: (LivePrice | undefined)[],
  locale: Locale,
): ProgramLandingContent {
  const options = content.pricing?.options ?? [];
  const prices = options.map((option, i) => livePrices[i] ?? fromFallback(option.fallbackPrice));
  const pageWide = (text: string) => fillTokens(text, prices, 0, locale);

  const { pricing, ...rest } = content;
  return {
    ...fillDeep(rest, pageWide),
    pricing: pricing && {
      ...fillDeep({ ...pricing, options: [] }, pageWide),
      options: pricing.options.map((option, i) =>
        fillDeep(option, (text) => fillTokens(text, prices, i, locale)),
      ),
    },
  };
}
