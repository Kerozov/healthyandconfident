/** How often a Stripe price charges. `null` = еднократно плащане. */
export type StripeRecurring = {
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
};

export type StripeCatalogRow = {
  stripeProductId: string;
  stripePriceId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string;
  /** Subscription cadence, or `null` for a one-off payment. */
  recurring: StripeRecurring | null;
  active: boolean;
};

export type StripePaymentLinkRow = {
  id: string;
  url: string;
  name: string;
  priceLabel: string;
  recurring: StripeRecurring | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
};

/**
 * "€38 / месец" or "€36 еднократно" — the admin has to tell a subscription
 * from a one-off payment before wiring a button to it, and Stripe's own amount
 * alone never says which one it is.
 */
export function stripePriceKindLabel(recurring: StripeRecurring | null): string {
  if (!recurring) return "еднократно";
  const unit =
    recurring.interval === "day"
      ? "ден"
      : recurring.interval === "week"
        ? "седмица"
        : recurring.interval === "month"
          ? "месец"
          : "година";
  if (recurring.intervalCount > 1) {
    const plural =
      recurring.interval === "day"
        ? "дни"
        : recurring.interval === "week"
          ? "седмици"
          : recurring.interval === "month"
            ? "месеца"
            : "години";
    return `на всеки ${recurring.intervalCount} ${plural}`;
  }
  return `на ${unit}`;
}

export function stripePriceSummary(
  priceLabel: string,
  recurring: StripeRecurring | null,
): string {
  const amount = priceLabel.trim();
  const kind = stripePriceKindLabel(recurring);
  if (!amount) return recurring ? "абонамент" : "";
  return `${amount} ${kind}`;
}
