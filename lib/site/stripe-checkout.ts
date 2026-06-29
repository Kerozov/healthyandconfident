import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";

export function canBundleCheckout(...products: (SiteProduct | null | undefined)[]): boolean {
  return products.every((p) => Boolean(p?.stripe_price_id?.trim()));
}

export async function startStripeCheckout(
  productIds: string[],
  locale: Locale,
): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds, locale }),
  });

  const data = (await res.json()) as { url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message ?? "Checkout failed");
  }

  window.location.href = data.url;
}

export function openStripeUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
