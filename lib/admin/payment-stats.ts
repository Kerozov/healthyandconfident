import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  dayKey,
  dayKeysInRange,
  fetchAllRows,
  inRange,
  rate,
  statsRange,
  trend,
  type StatsPeriod,
  type StatsRange,
} from "@/lib/admin/stats-shared";
import { groupOrders, type Order, type PurchaseRecord } from "@/lib/admin/orders";

export type PaymentTotals = {
  grossCents: number;
  refundedCents: number;
  netCents: number;
  orders: number;
  refundedOrders: number;
  failedOrders: number;
  itemsSold: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  aovCents: number;
  revenuePerCustomerCents: number;
};

export type PaymentTrends = {
  gross: number | null;
  orders: number | null;
  aov: number | null;
  customers: number | null;
};

export type RevenuePoint = {
  date: string;
  grossCents: number;
  orders: number;
};

export type ProductStatRow = {
  id: string;
  name: string;
  kind: "product" | "guide" | "unknown";
  units: number;
  revenueCents: number;
  customers: number;
  refunds: number;
  refundedCents: number;
  shareOfRevenue: number;
};

export type OrderRow = {
  sessionId: string;
  email: string;
  name: string | null;
  subscriberId: string | null;
  totalCents: number;
  currency: string;
  purchasedAt: string;
  status: "paid" | "refunded" | "failed";
  items: string[];
};

export type CustomerStatRow = {
  email: string;
  name: string | null;
  subscriberId: string | null;
  orders: number;
  revenueCents: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export type SourceStatRow = {
  source: string;
  customers: number;
  orders: number;
  revenueCents: number;
};

export type CurrencyStatRow = {
  currency: string;
  orders: number;
  grossCents: number;
};

export type CheckoutFunnel = {
  checkoutsStarted: number;
  uniqueStarters: number;
  paidOrders: number;
  conversionRate: number;
  abandoned: number;
  failedPayments: number;
};

export type PaymentStatsOverview = {
  period: StatsPeriod;
  range: StatsRange;
  currency: string;
  totals: PaymentTotals;
  previous: PaymentTotals;
  trends: PaymentTrends;
  /** All time, so the header can show the lifetime figure next to the period. */
  lifetime: { grossCents: number; orders: number; customers: number };
  timeline: RevenuePoint[];
  monthly: { month: string; grossCents: number; orders: number }[];
  products: ProductStatRow[];
  recentOrders: OrderRow[];
  problemOrders: OrderRow[];
  topCustomers: CustomerStatRow[];
  repeatCustomers: { single: number; repeat: number; repeatRate: number };
  sources: SourceStatRow[];
  currencies: CurrencyStatRow[];
  funnel: CheckoutFunnel;
  daysToPurchase: { average: number | null; median: number | null; sample: number };
};

function emptyTotals(): PaymentTotals {
  return {
    grossCents: 0,
    refundedCents: 0,
    netCents: 0,
    orders: 0,
    refundedOrders: 0,
    failedOrders: 0,
    itemsSold: 0,
    customers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    aovCents: 0,
    revenuePerCustomerCents: 0,
  };
}

function totalsFrom(
  orders: Order[],
  firstOrderByEmail: Map<string, string>,
): PaymentTotals {
  const totals = emptyTotals();
  const customers = new Set<string>();
  const newCustomers = new Set<string>();

  for (const order of orders) {
    if (order.status === "paid") {
      totals.orders += 1;
      totals.grossCents += order.totalCents;
      totals.itemsSold += order.lines.length;
      customers.add(order.email);
      if (firstOrderByEmail.get(order.email) === order.sessionId) {
        newCustomers.add(order.email);
      }
    } else if (order.status === "refunded") {
      totals.refundedOrders += 1;
      totals.refundedCents += order.totalCents;
    } else {
      totals.failedOrders += 1;
    }
  }

  totals.netCents = totals.grossCents - totals.refundedCents;
  totals.customers = customers.size;
  totals.newCustomers = newCustomers.size;
  totals.returningCustomers = customers.size - newCustomers.size;
  totals.aovCents = totals.orders ? Math.round(totals.grossCents / totals.orders) : 0;
  totals.revenuePerCustomerCents = customers.size
    ? Math.round(totals.grossCents / customers.size)
    : 0;

  return totals;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export async function getPaymentStats(
  period: StatsPeriod = 30,
): Promise<PaymentStatsOverview> {
  const range = statsRange(period);
  const supabase = getAdminClient();

  const [purchases, productData, guideData, subscriberRows, checkoutEvents] =
    await Promise.all([
      fetchAllRows<PurchaseRecord>((from, to) =>
        supabase
          .from("subscriber_purchases")
          .select(
            "email, subscriber_id, product_id, stripe_product_id, stripe_session_id, payment_status, amount_cents, order_total_cents, currency, purchased_at",
          )
          .order("purchased_at", { ascending: false })
          .range(from, to),
      ),
      supabase.from("site_products").select("id, title_bg, title_en"),
      supabase.from("site_guides").select("id, title_bg, title_en"),
      fetchAllRows<{
        id: string;
        email: string;
        name: string | null;
        source: string;
        created_at: string;
      }>((from, to) =>
        supabase
          .from("subscribers")
          .select("id, email, name, source, created_at")
          .range(from, to),
      ),
      fetchAllRows<{ contact_id: string; created_at: string }>((from, to) => {
        let q = supabase
          .from("contact_events")
          .select("contact_id, created_at")
          .eq("event_type", "checkout_started")
          .range(from, to);
        if (range.since) q = q.gte("created_at", range.since);
        return q;
      }),
    ]);

  const allOrders = groupOrders(purchases);

  // Currency with the most paid orders drives every money figure; anything else
  // is reported separately rather than silently summed together.
  const currencyCounts = new Map<string, { orders: number; grossCents: number }>();
  for (const order of allOrders) {
    if (order.status !== "paid") continue;
    const entry = currencyCounts.get(order.currency) ?? { orders: 0, grossCents: 0 };
    entry.orders += 1;
    entry.grossCents += order.totalCents;
    currencyCounts.set(order.currency, entry);
  }
  const currencies: CurrencyStatRow[] = [...currencyCounts.entries()]
    .map(([currency, e]) => ({ currency: currency.toUpperCase(), ...e }))
    .sort((a, b) => b.orders - a.orders);
  const currency = currencies[0]?.currency ?? "GBP";

  const orders = allOrders.filter((o) => o.currency.toUpperCase() === currency);

  // First paid order per customer — decides new vs returning in any window.
  const firstOrderByEmail = new Map<string, string>();
  const firstOrderAtByEmail = new Map<string, string>();
  for (const order of [...orders].sort((a, b) =>
    a.purchasedAt.localeCompare(b.purchasedAt),
  )) {
    if (order.status !== "paid") continue;
    if (!firstOrderByEmail.has(order.email)) {
      firstOrderByEmail.set(order.email, order.sessionId);
      firstOrderAtByEmail.set(order.email, order.purchasedAt);
    }
  }

  const currentOrders = orders.filter((o) =>
    inRange(o.purchasedAt, range.since, range.until),
  );
  const previousOrders = range.previousSince
    ? orders.filter((o) => inRange(o.purchasedAt, range.previousSince, range.previousUntil))
    : [];

  const totals = totalsFrom(currentOrders, firstOrderByEmail);
  const previous = totalsFrom(previousOrders, firstOrderByEmail);

  const lifetimePaid = orders.filter((o) => o.status === "paid");
  const lifetime = {
    grossCents: lifetimePaid.reduce((sum, o) => sum + o.totalCents, 0),
    orders: lifetimePaid.length,
    customers: new Set(lifetimePaid.map((o) => o.email)).size,
  };

  // Daily revenue.
  const dayIndex = new Map(
    dayKeysInRange(range).map((k) => [k, { grossCents: 0, orders: 0 }]),
  );
  for (const order of currentOrders) {
    if (order.status !== "paid") continue;
    const bucket = dayIndex.get(dayKey(order.purchasedAt));
    if (!bucket) continue;
    bucket.grossCents += order.totalCents;
    bucket.orders += 1;
  }
  const timeline: RevenuePoint[] = [...dayIndex.entries()].map(([date, v]) => ({
    date,
    ...v,
  }));

  // Monthly revenue — always all-time, so seasonality is visible.
  const monthMap = new Map<string, { grossCents: number; orders: number }>();
  for (const order of lifetimePaid) {
    const key = order.purchasedAt.slice(0, 7);
    const entry = monthMap.get(key) ?? { grossCents: 0, orders: 0 };
    entry.grossCents += order.totalCents;
    entry.orders += 1;
    monthMap.set(key, entry);
  }
  const monthly = [...monthMap.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Product performance. Line amounts are per item; older rows without an
  // amount fall back to an even split of the order total.
  const productNames = new Map<string, { name: string; kind: "product" | "guide" }>();
  for (const p of ((productData.data as { id: string; title_bg: string; title_en: string }[] | null) ?? [])) {
    productNames.set(p.id, { name: p.title_bg || p.title_en, kind: "product" });
  }
  for (const g of ((guideData.data as { id: string; title_bg: string; title_en: string }[] | null) ?? [])) {
    productNames.set(g.id, { name: g.title_bg || g.title_en, kind: "guide" });
  }

  const productMap = new Map<
    string,
    {
      units: number;
      revenueCents: number;
      refunds: number;
      refundedCents: number;
      customers: Set<string>;
    }
  >();

  for (const order of currentOrders) {
    if (order.status === "failed") continue;
    const share = order.lines.length > 0 ? order.totalCents / order.lines.length : 0;
    for (const line of order.lines) {
      const id =
        line.product_id ||
        line.stripe_product_id?.replace(/^guide:/, "") ||
        "unknown";
      const entry = productMap.get(id) ?? {
        units: 0,
        revenueCents: 0,
        refunds: 0,
        refundedCents: 0,
        customers: new Set<string>(),
      };
      const amount = line.amount_cents ?? Math.round(share);
      if (order.status === "paid") {
        entry.units += 1;
        entry.revenueCents += amount;
        entry.customers.add(order.email);
      } else {
        entry.refunds += 1;
        entry.refundedCents += amount;
      }
      productMap.set(id, entry);
    }
  }

  const productRevenueTotal = [...productMap.values()].reduce(
    (sum, e) => sum + e.revenueCents,
    0,
  );

  const products: ProductStatRow[] = [...productMap.entries()]
    .map(([id, e]) => {
      const meta = productNames.get(id);
      return {
        id,
        name: meta?.name ?? (id === "unknown" ? "Без продукт" : id),
        kind: meta?.kind ?? ("unknown" as const),
        units: e.units,
        revenueCents: e.revenueCents,
        customers: e.customers.size,
        refunds: e.refunds,
        refundedCents: e.refundedCents,
        shareOfRevenue: rate(e.revenueCents, productRevenueTotal),
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const subscriberByEmail = new Map(
    subscriberRows.map((s) => [s.email.toLowerCase(), s]),
  );

  function toOrderRow(order: Order): OrderRow {
    const sub = subscriberByEmail.get(order.email);
    return {
      sessionId: order.sessionId,
      email: order.email,
      name: sub?.name ?? null,
      subscriberId: sub?.id ?? null,
      totalCents: order.totalCents,
      currency: order.currency.toUpperCase(),
      purchasedAt: order.purchasedAt,
      status: order.status,
      items: order.lines.map((line) => {
        const id =
          line.product_id || line.stripe_product_id?.replace(/^guide:/, "") || "";
        return productNames.get(id)?.name ?? id ?? "—";
      }),
    };
  }

  const recentOrders = currentOrders
    .filter((o) => o.status === "paid")
    .slice(0, 25)
    .map(toOrderRow);

  const problemOrders = currentOrders
    .filter((o) => o.status !== "paid")
    .slice(0, 25)
    .map(toOrderRow);

  // Lifetime value per customer (all time — LTV is not a windowed metric).
  const customerMap = new Map<
    string,
    { orders: number; revenueCents: number; first: string; last: string }
  >();
  for (const order of lifetimePaid) {
    const entry = customerMap.get(order.email) ?? {
      orders: 0,
      revenueCents: 0,
      first: order.purchasedAt,
      last: order.purchasedAt,
    };
    entry.orders += 1;
    entry.revenueCents += order.totalCents;
    if (order.purchasedAt < entry.first) entry.first = order.purchasedAt;
    if (order.purchasedAt > entry.last) entry.last = order.purchasedAt;
    customerMap.set(order.email, entry);
  }

  const topCustomers: CustomerStatRow[] = [...customerMap.entries()]
    .map(([email, e]) => {
      const sub = subscriberByEmail.get(email);
      return {
        email,
        name: sub?.name ?? null,
        subscriberId: sub?.id ?? null,
        orders: e.orders,
        revenueCents: e.revenueCents,
        firstOrderAt: e.first,
        lastOrderAt: e.last,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 20);

  const repeat = [...customerMap.values()].filter((c) => c.orders > 1).length;
  const single = customerMap.size - repeat;

  // Which acquisition source produced paying customers.
  const sourceMap = new Map<
    string,
    { customers: Set<string>; orders: number; revenueCents: number }
  >();
  for (const order of currentOrders) {
    if (order.status !== "paid") continue;
    const source = subscriberByEmail.get(order.email)?.source || "—";
    const entry = sourceMap.get(source) ?? {
      customers: new Set<string>(),
      orders: 0,
      revenueCents: 0,
    };
    entry.customers.add(order.email);
    entry.orders += 1;
    entry.revenueCents += order.totalCents;
    sourceMap.set(source, entry);
  }
  const sources: SourceStatRow[] = [...sourceMap.entries()]
    .map(([source, e]) => ({
      source,
      customers: e.customers.size,
      orders: e.orders,
      revenueCents: e.revenueCents,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const funnel: CheckoutFunnel = {
    checkoutsStarted: checkoutEvents.length,
    uniqueStarters: new Set(checkoutEvents.map((e) => e.contact_id)).size,
    paidOrders: totals.orders,
    conversionRate: rate(totals.orders, checkoutEvents.length),
    abandoned: Math.max(0, checkoutEvents.length - totals.orders),
    failedPayments: totals.failedOrders,
  };

  // How long from signup to first purchase.
  const gaps: number[] = [];
  for (const [email, firstAt] of firstOrderAtByEmail) {
    const sub = subscriberByEmail.get(email);
    if (!sub) continue;
    const days = Math.round(
      (new Date(firstAt).getTime() - new Date(sub.created_at).getTime()) / 86_400_000,
    );
    if (days >= 0 && days < 3650) gaps.push(days);
  }

  return {
    period,
    range,
    currency,
    totals,
    previous,
    trends: {
      gross: range.previousSince ? trend(totals.grossCents, previous.grossCents) : null,
      orders: range.previousSince ? trend(totals.orders, previous.orders) : null,
      aov: range.previousSince ? trend(totals.aovCents, previous.aovCents) : null,
      customers: range.previousSince ? trend(totals.customers, previous.customers) : null,
    },
    lifetime,
    timeline,
    monthly,
    products,
    recentOrders,
    problemOrders,
    topCustomers,
    repeatCustomers: {
      single,
      repeat,
      repeatRate: rate(repeat, customerMap.size),
    },
    sources,
    currencies,
    funnel,
    daysToPurchase: {
      average: gaps.length
        ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
        : null,
      median: median(gaps),
      sample: gaps.length,
    },
  };
}
