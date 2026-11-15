"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { startBlackFridayCheckout } from "@/lib/site/stripe-checkout";

/** Opens Stripe Checkout at the Black Friday price for one item or a bundle. */
export function BlackFridayBuyButton({
  itemKey,
  bundleId,
  earlyKey,
  locale,
  label,
}: {
  itemKey?: string;
  bundleId?: string;
  earlyKey?: string;
  locale: Locale;
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buy() {
    setError(null);
    setPending(true);
    void startBlackFridayCheckout({ itemKey, bundleId }, locale, earlyKey)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout failed");
      })
      .finally(() => setPending(false));
  }

  return (
    <div>
      <button
        type="button"
        onClick={buy}
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <ArrowUpRight className="h-5 w-5" aria-hidden />
        )}
        {label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
