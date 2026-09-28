import "server-only";

import { unstable_cache } from "next/cache";
import type { LivePrice } from "@/lib/site/price-format";
import { getStripe } from "@/lib/stripe/server";

export const STRIPE_PRICES_TAG = "stripe-prices";

/**
 * One Stripe price, cached with no expiry: Stripe never changes the amount,
 * currency or period of an existing price — a new amount is a new price id,
 * which the admin wires to the button (and saving the button re-renders the
 * pages). A failed read throws, so it is not cached and is retried next time.
 */
const readPrice = unstable_cache(
  async (priceId: string): Promise<LivePrice | null> => {
    const price = await getStripe().prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    return {
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
          }
        : null,
    };
  },
  ["stripe-live-price"],
  { tags: [STRIPE_PRICES_TAG] },
);

/**
 * Stripe prices keyed by id. A price that cannot be read — deleted, from the
 * other Stripe mode, no API key at build time, Stripe down — is left out, and
 * the page shows the text written for it instead of failing to render.
 */
export async function getLivePrices(
  priceIds: (string | null | undefined)[],
): Promise<Record<string, LivePrice>> {
  const unique = [...new Set(priceIds.map((id) => id?.trim() ?? "").filter(Boolean))];
  const rows = await Promise.all(
    unique.map(async (id) => {
      try {
        const price = await readPrice(id);
        return price ? ([id, price] as const) : null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(rows.filter((row) => row !== null));
}
