/**
 * Black Friday rules that need no database or Stripe: item keys, discount and
 * bundle arithmetic. Everything here works in minor units (cents), the way
 * Stripe stores prices, so the page and Checkout always agree to the cent.
 */

/** What on the site a discount or a bundle points at. */
export type BlackFridayItemKind = "product" | "guide" | "program";

/** `percent` — % off; `amount` — euro off; `price` — the final price in euro. */
export type BlackFridayDiscountType = "percent" | "amount" | "price";

/** `percent` — % off the sum of the items; `price` — the bundle's final price. */
export type BlackFridayBundlePriceType = "percent" | "price";

export const BUNDLE_MIN_ITEMS = 2;
export const BUNDLE_MAX_ITEMS = 6;

/** Session metadata marker the webhook looks for. */
export const BLACK_FRIDAY_METADATA = "black_friday";

const KINDS: readonly BlackFridayItemKind[] = ["product", "guide", "program"];
const ITEM_KEY_RE = /^(product|guide|program):([A-Za-z0-9_-]+)$/;

export function blackFridayItemKey(kind: BlackFridayItemKind, ref: string): string {
  return `${kind}:${ref}`;
}

export function parseBlackFridayItemKey(
  key: string,
): { kind: BlackFridayItemKind; ref: string } | null {
  const match = ITEM_KEY_RE.exec(key.trim());
  if (!match) return null;
  const kind = match[1] as BlackFridayItemKind;
  return KINDS.includes(kind) ? { kind, ref: match[2] } : null;
}

/** Euro typed into the admin (e.g. 9.5) → cents, or null when it is not a clean amount. */
export function euroToCents(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const cents = Math.round(value * 100);
  return Math.abs(value * 100 - cents) > 1e-6 ? null : cents;
}

/**
 * The discounted price of one item in cents, or null when the rule gives no
 * real discount (nothing off, free, or not below the regular price).
 */
export function discountedAmount(
  regularCents: number,
  type: BlackFridayDiscountType,
  value: number,
): number | null {
  if (!Number.isInteger(regularCents) || regularCents <= 0) return null;
  if (!Number.isFinite(value) || value <= 0) return null;

  let finalCents: number;
  if (type === "percent") {
    if (value >= 100) return null;
    finalCents = regularCents - Math.round((regularCents * value) / 100);
  } else {
    const cents = euroToCents(value);
    if (cents === null) return null;
    finalCents = type === "amount" ? regularCents - cents : cents;
  }
  return finalCents > 0 && finalCents < regularCents ? finalCents : null;
}

/**
 * The bundle's price in cents, or null when it is not below the items bought
 * one by one. Each item costs at least a cent on its own Checkout line.
 */
export function bundleFinalAmount(
  regularTotal: number,
  itemCount: number,
  type: BlackFridayBundlePriceType,
  value: number,
): number | null {
  if (!Number.isInteger(regularTotal) || regularTotal <= 0) return null;
  const finalCents = discountedAmount(regularTotal, type, value);
  if (finalCents === null || finalCents < itemCount) return null;
  return finalCents;
}

/**
 * Splits the bundle price across its items in proportion to their regular
 * prices. The parts sum to exactly `finalAmount` and none is below one cent,
 * so Stripe Checkout can show every item on its own line.
 */
export function allocateBundleAmounts(regularAmounts: number[], finalAmount: number): number[] {
  const total = regularAmounts.reduce((sum, amount) => sum + amount, 0);
  if (
    regularAmounts.length === 0 ||
    regularAmounts.some((amount) => !Number.isInteger(amount) || amount <= 0) ||
    !Number.isInteger(finalAmount) ||
    finalAmount < regularAmounts.length ||
    finalAmount > total
  ) {
    throw new Error("Невалидни суми за комплекта.");
  }

  const shares = regularAmounts.map((amount, index) => {
    const exact = (amount * finalAmount) / total;
    const floor = Math.floor(exact);
    return { index, value: Math.max(1, floor), remainder: exact - floor };
  });
  let difference = finalAmount - shares.reduce((sum, share) => sum + share.value, 0);

  // Leftover cents go to the largest fractional parts; if the one-cent floor
  // pushed the sum over, take cents back from the most expensive items.
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; difference > 0; i = (i + 1) % byRemainder.length, difference -= 1) {
    byRemainder[i].value += 1;
  }
  const byValue = [...shares].sort((a, b) => b.value - a.value || a.index - b.index);
  for (let i = 0; difference < 0; i = (i + 1) % byValue.length) {
    if (byValue[i].value > 1) {
      byValue[i].value -= 1;
      difference += 1;
    }
  }

  return shares.map((share) => share.value);
}

/** Whole percent saved, for the „−30%“ badge. */
export function savedPercent(regularCents: number, finalCents: number): number {
  if (regularCents <= 0) return 0;
  return Math.round(((regularCents - finalCents) / regularCents) * 100);
}

/**
 * The programme buttons behind a Black Friday Checkout (`bf_items` metadata),
 * so the buyer joins the same card groups as from the button itself.
 */
export function programKeysFromMetadata(itemKeys: string | null | undefined): string[] {
  return (itemKeys ?? "")
    .split(",")
    .map((key) => parseBlackFridayItemKey(key))
    .filter((item): item is { kind: BlackFridayItemKind; ref: string } => item?.kind === "program")
    .map((item) => item.ref);
}
