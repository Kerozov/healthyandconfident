/**
 * Turning purchase lines into orders. Pure and dependency-free so the revenue
 * numbers can be checked without a database.
 */

export type PurchaseRecord = {
  email: string;
  subscriber_id: string | null;
  product_id: string | null;
  stripe_product_id: string | null;
  stripe_session_id: string | null;
  payment_status: "paid" | "refunded" | "failed";
  /** Amount of this line only. */
  amount_cents: number | null;
  /** Stripe session total, repeated on every line of the order. */
  order_total_cents: number | null;
  currency: string | null;
  purchased_at: string;
};

export type Order = {
  sessionId: string;
  email: string;
  status: "paid" | "refunded" | "failed";
  currency: string;
  totalCents: number;
  purchasedAt: string;
  lines: PurchaseRecord[];
};

/**
 * One Stripe checkout = one order.
 *
 * `order_total_cents` is written on every line of an order, so it is the
 * authoritative total. Rows written before that column existed stored the
 * session total on *each* line instead — summing those would multiply the order
 * value, so a multi-line order whose amounts are all identical collapses to one.
 * Lines with no session id can't be grouped by checkout, so email + timestamp
 * stands in.
 */
export function groupOrders(rows: PurchaseRecord[]): Order[] {
  const byKey = new Map<string, PurchaseRecord[]>();

  for (const row of rows) {
    const key = row.stripe_session_id?.trim() || `${row.email}|${row.purchased_at}`;
    const list = byKey.get(key) ?? [];
    list.push(row);
    byKey.set(key, list);
  }

  const orders: Order[] = [];

  for (const [sessionId, lines] of byKey) {
    const first = lines[0];
    const explicit = lines.find((l) => l.order_total_cents != null)?.order_total_cents;
    const amounts = lines.map((l) => l.amount_cents ?? 0);
    const lineSum = amounts.reduce((sum, amount) => sum + amount, 0);
    const allEqual = amounts.every((a) => a === amounts[0]);
    const legacyTotal = lines.length > 1 && allEqual ? amounts[0] : lineSum;

    orders.push({
      sessionId,
      email: first.email.toLowerCase(),
      status: first.payment_status,
      currency: (first.currency ?? "gbp").toLowerCase(),
      totalCents: explicit ?? legacyTotal,
      purchasedAt: lines
        .map((l) => l.purchased_at)
        .sort()
        .at(0)!,
      lines,
    });
  }

  return orders.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}
