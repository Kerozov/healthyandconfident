import "server-only";

import type Stripe from "stripe";
import type { Locale } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getStripe } from "@/lib/stripe/server";
import { getBlackFridayConfig } from "@/lib/black-friday/config";
import { blackFridayOffersOpen } from "@/lib/site/black-friday-phase";
import {
  getBlackFridayBundleOffers,
  getBlackFridayOffers,
} from "@/lib/black-friday/offers";
import { BLACK_FRIDAY_METADATA } from "@/lib/black-friday/pricing";
import {
  trackingMetadata,
  type CheckoutSessionResult,
  type CheckoutTracking,
} from "@/lib/stripe/create-checkout";

/** What the visitor clicked: one discounted item, or a bundle. */
export type BlackFridayCheckoutTarget = {
  itemKey?: string;
  bundleId?: string;
  /** The early-access key from the page URL, before the public start. */
  earlyKey?: string;
};

type CheckoutLine = {
  key: string;
  priceId: string;
  stripeProductId: string;
  amountCents: number;
};

function unavailable(locale: Locale): Error {
  return new Error(
    locale === "en"
      ? "This Black Friday offer is no longer available."
      : "Тази оферта за Черния петък вече не е налична.",
  );
}

/**
 * Checkout at the Black Friday price. The browser only names the offer; its
 * contents and price are worked out again here from the database and Stripe,
 * and only while the campaign is open. Each item is its own line on its own
 * Stripe product, so the sale is recorded exactly like a full-price one.
 */
export async function createBlackFridayCheckoutSession(
  target: BlackFridayCheckoutTarget,
  locale: Locale,
  contactId?: string,
  tracking?: CheckoutTracking,
): Promise<CheckoutSessionResult & { itemKeys: string[] }> {
  const config = await getBlackFridayConfig();
  if (!blackFridayOffersOpen(config, target.earlyKey)) throw unavailable(locale);

  let lines: CheckoutLine[];
  let bundleId = "";
  if (target.bundleId) {
    const bundle = (await getBlackFridayBundleOffers(locale)).find(
      (candidate) => candidate.id === target.bundleId,
    );
    if (!bundle) throw unavailable(locale);
    bundleId = bundle.id;
    lines = bundle.items.map((item) => ({
      key: item.key,
      priceId: item.priceId,
      stripeProductId: item.stripeProductId,
      amountCents: item.lineCents,
    }));
  } else if (target.itemKey) {
    const offer = (await getBlackFridayOffers(locale)).find(
      (candidate) => candidate.key === target.itemKey,
    );
    if (!offer) throw unavailable(locale);
    lines = [
      {
        key: offer.key,
        priceId: offer.priceId,
        stripeProductId: offer.stripeProductId,
        amountCents: offer.finalCents,
      },
    ];
  } else {
    throw unavailable(locale);
  }

  if (lines.some((line) => !Number.isInteger(line.amountCents) || line.amountCents <= 0)) {
    throw unavailable(locale);
  }

  const origin = publicSiteOrigin();
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: lines.map((line) => ({
      price_data: {
        currency: "eur",
        product: line.stripeProductId,
        unit_amount: line.amountCents,
      },
      quantity: 1,
    })),
    success_url: `${origin}/${locale}?checkout=success`,
    cancel_url: `${origin}/${locale}/black-friday`,
    locale: locale === "bg" ? "bg" : "en",
    metadata: {
      [BLACK_FRIDAY_METADATA]: "1",
      // Same order as line_items — the webhook pairs them back up.
      bf_items: lines.map((line) => line.key).join(","),
      // The regular prices, so purchase rows and reports name the real product.
      bf_prices: lines.map((line) => line.priceId).join(","),
      ...(bundleId ? { bf_bundle: bundleId } : {}),
      stripe_product_ids: lines.map((line) => line.stripeProductId).join(","),
      locale,
      ...(contactId ? { contact_id: contactId } : {}),
      ...trackingMetadata(tracking),
    },
  };

  const session = await getStripe().checkout.sessions.create(params);
  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  return {
    url: session.url,
    amountCents:
      session.amount_total ?? lines.reduce((sum, line) => sum + line.amountCents, 0),
    currency: session.currency ?? "eur",
    itemKeys: lines.map((line) => line.key),
  };
}
