import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { productHasStripePrice } from "@/lib/site/product-locale";
import { metaEventId, metaBrowserIds, trackMeta } from "@/lib/meta/client";
import { trackSiteCheckout } from "@/lib/analytics/client";

export function canBundleCheckout(
  locale: Locale,
  ...products: (SiteProduct | null | undefined)[]
): boolean {
  return products.every((p) => Boolean(p && productHasStripePrice(p, locale)));
}

/**
 * Fires the browser half of `InitiateCheckout`. The matching Conversions API
 * event is sent by `/api/checkout`, which knows the exact Stripe prices — both
 * halves share this id so Meta counts one conversion.
 */
function beginCheckoutTracking(contentIds: string[]): string {
  const eventId = metaEventId();
  trackSiteCheckout();
  trackMeta(
    "InitiateCheckout",
    { contentIds, contentType: "product", numItems: contentIds.length },
    undefined,
    { mirror: false, eventId },
  );
  return eventId;
}

export async function startGuideCheckout(guideId: string, locale: Locale): Promise<void> {
  const metaEvent = beginCheckoutTracking([guideId]);
  const ids = metaBrowserIds();

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guideIds: [guideId],
      locale,
      metaEventId: metaEvent,
      fbp: ids.fbp,
      fbc: ids.fbc,
      fbclid: ids.fbclid,
    }),
  });

  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Checkout failed");
  }

  window.location.href = data.url;
}

export async function startStripeCheckout(
  productIds: string[],
  locale: Locale,
): Promise<void> {
  const metaEvent = beginCheckoutTracking(productIds);
  const ids = metaBrowserIds();

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productIds,
      locale,
      metaEventId: metaEvent,
      fbp: ids.fbp,
      fbc: ids.fbc,
      fbclid: ids.fbclid,
    }),
  });

  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Checkout failed");
  }

  window.location.href = data.url;
}

export async function startPlacementCheckout(
  placementKey: string,
  locale: Locale,
): Promise<void> {
  const metaEvent = beginCheckoutTracking([placementKey]);
  const ids = metaBrowserIds();

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      placementKey,
      locale,
      metaEventId: metaEvent,
      fbp: ids.fbp,
      fbc: ids.fbc,
      fbclid: ids.fbclid,
    }),
  });

  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Checkout failed");
  }

  window.location.href = data.url;
}

/**
 * Opens a Stripe payment link that bypasses our API. Nothing server-side sees
 * this click, so the event is mirrored to the Conversions API from here.
 */
export function openStripeUrl(url: string, contentIds: string[] = []) {
  trackSiteCheckout();
  trackMeta("InitiateCheckout", {
    contentIds: contentIds.length > 0 ? contentIds : [url],
    contentType: "product",
    numItems: Math.max(1, contentIds.length),
  });
  window.open(url, "_blank", "noopener,noreferrer");
}
