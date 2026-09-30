import type { Locale } from "@/i18n/config";
import type { StripeRecurring } from "@/lib/stripe/catalog-types";
import { formatMoney } from "@/lib/money";

/**
 * What a Stripe price charges — the only source the site may quote a price
 * from, so the page never shows a different number than Checkout takes.
 */
export type LivePrice = {
  /** Minor units, as Stripe stores them (18000 = 180 €). */
  unitAmount: number;
  currency: string;
  /** `null` = one-off payment. */
  recurring: StripeRecurring | null;
};

const INTL_LOCALE: Record<Locale, string> = { bg: "bg-BG", en: "en-GB" };

const PERIODS: Record<Locale, Record<StripeRecurring["interval"], [string, string]>> = {
  // [one period, several periods]
  bg: {
    day: ["ден", "дни"],
    week: ["седмица", "седмици"],
    month: ["месец", "месеца"],
    year: ["година", "години"],
  },
  en: {
    day: ["day", "days"],
    week: ["week", "weeks"],
    month: ["month", "months"],
    year: ["year", "years"],
  },
};

/** Average month, so „per day“ figures match a monthly bill. */
export const DAYS_PER_MONTH = 365 / 12;

export function formatCents(cents: number, currency: string, locale: Locale): string {
  return formatMoney(Math.round(cents), currency, INTL_LOCALE[locale]);
}

/** „180 €“ / „€180“ — the amount alone. */
export function priceAmount(price: LivePrice, locale: Locale): string {
  return formatCents(price.unitAmount, price.currency, locale);
}

/** „/месец“, „/3 месеца“, or nothing for a one-off payment. */
export function pricePeriod(recurring: StripeRecurring | null, locale: Locale): string {
  if (!recurring) return "";
  const [one, many] = PERIODS[locale][recurring.interval];
  return recurring.intervalCount > 1 ? `/${recurring.intervalCount} ${many}` : `/${one}`;
}

/** „38 €/месец“ for a subscription, „36 €“ for a one-off payment. */
export function priceWithPeriod(price: LivePrice, locale: Locale): string {
  return `${priceAmount(price, locale)}${pricePeriod(price.recurring, locale)}`;
}

/**
 * What the price comes to per month, whatever period Stripe bills in — a
 * 12-month plan stored as 336 €/year and one stored as 28 €/month both give
 * 28 €. A one-off payment is returned as is.
 */
export function monthlyCents(price: LivePrice): number {
  const r = price.recurring;
  if (!r) return price.unitAmount;
  const months =
    r.interval === "year"
      ? 12
      : r.interval === "month"
        ? 1
        : r.interval === "week"
          ? 12 / 52
          : 1 / DAYS_PER_MONTH;
  return price.unitAmount / (months * r.intervalCount);
}

/**
 * A money amount written in a label — „69€“, „€ 69“, „5,90 €“, „1 090 лв.“.
 * Group separators are only accepted before exactly three digits, so „5.90“ is
 * five euro ninety, and a longer number is never cut in the middle.
 */
const NUMBER = String.raw`\d{1,3}(?:[  .]\d{3})+(?:,\d{1,2})?(?!\d)|\d+(?:[.,]\d{1,2})?(?!\d)`;
const MONEY_IN_LABEL = new RegExp(
  String.raw`[€£$]\s?(?:${NUMBER})|(?:${NUMBER})\s?(?:€|£|\$|EUR\b|евро|лв\.?)`,
  "i",
);

/** True when a label quotes an amount („69 €“), not only words („групова програма“). */
export function labelHasAmount(label: string): boolean {
  return MONEY_IN_LABEL.test(label);
}

/** The old price a label compares against: „69 €, вместо 152 €“ → „152 €“. */
const WAS_PRICE = /[\s,;·(]*(?:вместо|instead of)\s+([^)]+?)\)?\s*$/i;

/**
 * „69 €, вместо 152 €“ split into the price charged and the price it replaces,
 * so a card can show the old one struck through. A label without a „вместо“
 * part comes back whole, with `was` empty.
 */
export function splitPriceLabel(label: string): { now: string; was: string } {
  const text = label.trim();
  const match = WAS_PRICE.exec(text);
  if (!match || match.index === 0) return { now: text, was: "" };
  return { now: text.slice(0, match.index).trim(), was: match[1].trim() };
}

/**
 * A label typed in the admin, brought in line with the Stripe price it sells.
 *
 * The first amount in the label is the price („69€, вместо 152€“ → the 69), so
 * only that one is replaced and the wording around it — an old price, „от“, a
 * period — stays as written. A label with no amount in it („групова
 * програма“) is left alone. An empty label becomes the Stripe price when
 * `fillEmpty` is set; otherwise it stays empty so a fallback can apply.
 */
export function withLivePrice(
  label: string,
  price: LivePrice | undefined,
  locale: Locale,
  { fillEmpty = true }: { fillEmpty?: boolean } = {},
): string {
  if (!price) return label;
  const text = label.trim();
  if (!text) return fillEmpty ? priceWithPeriod(price, locale) : label;

  const match = MONEY_IN_LABEL.exec(text);
  if (!match) return label;
  // A label that is nothing but the amount gets the billing period too.
  if (match[0].length === text.length) return priceWithPeriod(price, locale);
  return text.replace(match[0], priceAmount(price, locale));
}
