"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteGuide } from "@/lib/supabase/types";
import { guideSellableInLocale, guideStripeForLocale } from "@/lib/site/guide-catalog";
import { openStripeUrl, startGuideCheckout } from "@/lib/site/stripe-checkout";

export function GuideCheckoutCard({
  guide,
  locale,
}: {
  guide: SiteGuide;
  locale: Locale;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = locale === "bg" ? guide.title_bg : guide.title_en;
  const description =
    locale === "bg" ? guide.description_bg : guide.description_en;
  const price = locale === "bg" ? guide.price_label_bg : guide.price_label_en;
  const cta = locale === "bg" ? "Купи сега" : "Buy now";
  const buyable = guideSellableInLocale(guide, locale);
  const stripe = guideStripeForLocale(guide, locale);
  const hasSiteCheckout = Boolean(stripe.stripe_price_id);
  const checkoutUrl = stripe.stripe_url;

  function buy() {
    setError(null);
    setPending(true);
    const run = hasSiteCheckout
      ? startGuideCheckout(guide.id, locale)
      : Promise.resolve().then(() => {
          if (!checkoutUrl) throw new Error("Checkout is not configured");
          openStripeUrl(checkoutUrl, [guide.id]);
        });
    void run
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout failed");
      })
      .finally(() => setPending(false));
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-card">
      {guide.image_url && (
        <div className="flex items-center justify-center bg-cream-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={guide.image_url}
            alt={title}
            className="h-auto max-h-[360px] w-full object-contain"
          />
        </div>
      )}

      <div className="p-7 sm:p-9">
        <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
          {locale === "bg" ? "наръчник" : "guide"}
        </span>
        {price && (
          <p className="mt-3 font-display text-3xl font-semibold text-slate-800">
            {price}
          </p>
        )}
        <h1 className="mt-2 font-display text-2xl font-semibold leading-snug text-slate-800 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-ink-soft">
            {description}
          </p>
        )}

        {buyable ? (
          <button
            type="button"
            onClick={buy}
            disabled={pending}
            className="mt-7 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-8 py-4 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500 disabled:opacity-60 sm:w-auto"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUpRight className="h-5 w-5" />
            )}
            {cta}
          </button>
        ) : (
          <p className="mt-7 rounded-xl bg-cream px-4 py-3 text-sm text-slate-800">
            {locale === "bg"
              ? "Това ръководство временно не може да се купи онлайн. Пиши ни и ще ти помогнем."
              : "This guide cannot be purchased online right now. Get in touch and we will help."}
          </p>
        )}

        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}

        <p className="mt-5 flex items-center gap-2 text-xs text-ink-soft">
          <ShieldCheck className="h-4 w-4 text-forest-500" />
          {locale === "bg"
            ? "Плащането минава през Stripe — сигурно и криптирано."
            : "Payment is handled by Stripe — secure and encrypted."}
        </p>
      </div>
    </div>
  );
}
