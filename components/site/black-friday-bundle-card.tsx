"use client";

import { ArrowUpRight, Check, Gift } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteBundle } from "@/lib/supabase/types";
import { openStripeUrl } from "@/lib/site/stripe-checkout";

/**
 * One Black Friday package on `/black-friday`. The buy button opens the admin's
 * Stripe Payment Link for this package; without a link the package is shown but
 * cannot be bought online.
 */
export function BlackFridayBundleCard({
  bundle,
  locale,
  includedLabel,
  wasLabel,
  notAvailable,
}: {
  bundle: SiteBundle;
  locale: Locale;
  includedLabel: string;
  wasLabel: string;
  notAvailable: string;
}) {
  const title = locale === "bg" ? bundle.title_bg : bundle.title_en;
  const subtitle = locale === "bg" ? bundle.subtitle_bg : bundle.subtitle_en;
  const includes = locale === "bg" ? bundle.includes_bg : bundle.includes_en;
  const oldPrice = locale === "bg" ? bundle.old_price_bg : bundle.old_price_en;
  const price = locale === "bg" ? bundle.price_bg : bundle.price_en;
  const bonus = locale === "bg" ? bundle.bonus_bg : bundle.bonus_en;
  const badge = locale === "bg" ? bundle.badge_bg : bundle.badge_en;
  const cta =
    (locale === "bg" ? bundle.cta_label_bg : bundle.cta_label_en)?.trim() ||
    (locale === "bg" ? "Купи сега" : "Buy now");
  const url = (locale === "bg" ? bundle.stripe_url : bundle.stripe_url_en)?.trim();

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-3xl border bg-white shadow-card ${
        bundle.highlight ? "border-gold-400 ring-2 ring-gold-400/60" : "border-forest-100"
      }`}
    >
      {badge && (
        <span className="self-start rounded-br-2xl bg-gold-400 px-4 py-1.5 text-sm font-bold text-forest-900">
          {badge}
        </span>
      )}

      <div className="flex flex-1 flex-col p-7">
        <h2 className="font-display text-2xl font-semibold leading-snug text-slate-800">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-base leading-relaxed text-ink-soft">{subtitle}</p>
        )}

        {includes.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
              {includedLabel}
            </p>
            <ul className="mt-2 space-y-2">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {bonus && (
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm font-medium text-forest-800">
            <Gift className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" />
            <span>{bonus}</span>
          </p>
        )}

        <div className="mt-6 flex items-end gap-3">
          {price && (
            <p className="font-display text-3xl font-semibold text-slate-800">{price}</p>
          )}
          {oldPrice && (
            <p className="pb-1 text-base text-ink-soft">
              {wasLabel}{" "}
              <span className="line-through">{oldPrice}</span>
            </p>
          )}
        </div>

        <div className="mt-auto pt-6">
          {url ? (
            <button
              type="button"
              onClick={() => openStripeUrl(url, [bundle.id])}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-8 py-4 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500"
            >
              <ArrowUpRight className="h-5 w-5" />
              {cta}
            </button>
          ) : (
            <p className="rounded-xl bg-cream px-4 py-3 text-sm text-slate-800">
              {notAvailable}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
