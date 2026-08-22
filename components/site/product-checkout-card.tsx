"use client";

import { useState } from "react";
import { ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { useProductCheckout } from "@/components/site/use-product-checkout";
import { productSellableInLocale } from "@/lib/site/product-locale";

/**
 * Landing card behind every product link in an email. It exists so an email
 * click goes through the site — where the configured upsell runs — instead of
 * jumping straight to a Stripe payment link.
 */
export function ProductCheckoutCard({
  product,
  locale,
}: {
  product: SiteProduct;
  locale: Locale;
}) {
  const buyProduct = useProductCheckout(locale);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = locale === "bg" ? product.title_bg : product.title_en;
  const description =
    locale === "bg" ? product.description_bg : product.description_en;
  const price = locale === "bg" ? product.price_label_bg : product.price_label_en;
  const cta =
    (locale === "bg" ? product.cta_label_bg : product.cta_label_en)?.trim() ||
    (locale === "bg" ? "Купи сега" : "Buy now");
  const buyable = productSellableInLocale(product, locale);

  function buy() {
    setError(null);
    setPending(true);
    void buyProduct(product)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Checkout failed");
      })
      .finally(() => setPending(false));
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-card">
      {product.image_url && (
        <div className="flex items-center justify-center bg-cream-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image_url}
            alt={title}
            className="h-auto max-h-[360px] w-full object-contain"
          />
        </div>
      )}

      <div className="p-7 sm:p-9">
        {price && (
          <p className="font-display text-3xl font-semibold text-slate-800">{price}</p>
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
              ? "Този продукт временно не може да се купи онлайн. Пиши ни и ще ти помогнем."
              : "This product cannot be purchased online right now. Get in touch and we will help."}
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
