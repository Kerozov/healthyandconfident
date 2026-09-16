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

function loadingDocument(locale: Locale): string {
  const title = locale === "bg" ? "Отваряме плащането…" : "Opening checkout…";
  const note =
    locale === "bg"
      ? "Пренасочваме те към защитеното плащане в Stripe."
      : "Taking you to secure checkout on Stripe.";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;
justify-content:center;gap:14px;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;
background:#faf7f2;color:#26312c}.s{width:34px;height:34px;border-radius:50%;
border:3px solid rgba(38,49,44,.15);border-top-color:#3f6b52;animation:r .8s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}p{margin:0}small{opacity:.65}</style></head>
<body><div class="s"></div><p>${title}</p><small>${note}</small></body></html>`;
}

/**
 * The tab the visitor ends up paying in, opened synchronously inside the click
 * so no popup blocker stops it.
 *
 * `noopener` is deliberately absent: with it the browser hands back `null`
 * instead of a window handle, which is what used to leave an empty tab behind
 * while Stripe loaded over the page the visitor was reading. The link back to
 * this page is cut with `opener = null` instead, which keeps our handle.
 */
function openCheckoutTab(locale: Locale): Window | null {
  const tab = window.open("", "_blank");
  if (!tab) return null;
  try {
    tab.opener = null;
    tab.document.write(loadingDocument(locale));
    tab.document.close();
  } catch {
    // about:blank in a stricter browser — the tab still navigates below.
  }
  return tab;
}

function sendToCheckout(tab: Window | null, url: string) {
  if (tab && !tab.closed) {
    tab.location.replace(url);
    try {
      tab.focus();
    } catch {
      // Focus is a courtesy; the tab is already open with the payment in it.
    }
    return;
  }
  // Popup blocked — better to pay in this tab than to lose the sale.
  window.location.href = url;
}

type CheckoutRequest = {
  productIds?: string[];
  guideIds?: string[];
  placementKey?: string;
};

/**
 * One path to Stripe for every button on the site: open the tab, ask the API
 * for a Checkout session, land the tab on it. Subscriptions and one-off prices
 * differ only in the `mode` the server picks, so nothing here has to know.
 */
async function startCheckout(
  request: CheckoutRequest,
  contentIds: string[],
  locale: Locale,
): Promise<void> {
  const metaEvent = beginCheckoutTracking(contentIds);
  const ids = metaBrowserIds();
  const tab = openCheckoutTab(locale);

  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
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
    sendToCheckout(tab, data.url);
  } catch (err) {
    tab?.close();
    throw err;
  }
}

export async function startGuideCheckout(guideId: string, locale: Locale): Promise<void> {
  await startCheckout({ guideIds: [guideId] }, [guideId], locale);
}

export async function startStripeCheckout(
  productIds: string[],
  locale: Locale,
): Promise<void> {
  await startCheckout({ productIds }, productIds, locale);
}

export async function startPlacementCheckout(
  placementKey: string,
  locale: Locale,
): Promise<void> {
  await startCheckout({ placementKey }, [placementKey], locale);
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
