/**
 * "Bought after an email" — a timing match, not proof the email caused it.
 *
 * A recipient counts as a buyer for an email when they have a paid order within
 * `ATTRIBUTION_DAYS` after that email was sent. The UI always labels it as such.
 */
export const ATTRIBUTION_DAYS = 7;

const WINDOW_MS = ATTRIBUTION_DAYS * 24 * 60 * 60 * 1000;

export type PaidPurchase = { email: string; purchasedAt: string };

/** Paid purchase times per lower-cased email, oldest first. */
export type PurchaseIndex = Map<string, number[]>;

export function buildPurchaseIndex(purchases: PaidPurchase[]): PurchaseIndex {
  const index: PurchaseIndex = new Map();
  for (const purchase of purchases) {
    const email = purchase.email.trim().toLowerCase();
    const at = new Date(purchase.purchasedAt).getTime();
    if (!email || !Number.isFinite(at)) continue;
    const list = index.get(email);
    if (list) list.push(at);
    else index.set(email, [at]);
  }
  for (const list of index.values()) list.sort((a, b) => a - b);
  return index;
}

/** First paid purchase in (sentAt, sentAt + window], as an ISO string, or null. */
export function purchaseAfterEmail(
  index: PurchaseIndex,
  email: string,
  sentAt: string,
): string | null {
  const list = index.get(email.trim().toLowerCase());
  if (!list) return null;
  const sent = new Date(sentAt).getTime();
  if (!Number.isFinite(sent)) return null;
  for (const at of list) {
    if (at <= sent) continue;
    if (at - sent <= WINDOW_MS) return new Date(at).toISOString();
    break;
  }
  return null;
}
