import Link from "next/link";
import { Plus } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatCents } from "@/lib/site/price-format";
import type {
  BlackFridayBundleOffer,
  BlackFridayOffer,
} from "@/lib/black-friday/offers";
import { BlackFridayBuyButton } from "@/components/site/black-friday/buy-button";

export type BlackFridayCardCopy = {
  wasLabel: string;
  savingsLabel: string;
  separatelyLabel: string;
  includedLabel: string;
  buyCta: string;
  bundleCta: string;
  detailsLink: string;
};

function eur(cents: number, locale: Locale): string {
  return formatCents(cents, "eur", locale);
}

function Thumb({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  if (!src) {
    return <div className={`${className} bg-gradient-to-br from-cream-2 to-forest-100`} aria-hidden />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={`${className} object-cover`} />;
}

function PriceRow({
  regularCents,
  finalCents,
  locale,
  wasLabel,
}: {
  regularCents: number;
  finalCents: number;
  locale: Locale;
  wasLabel: string;
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <strong className="font-display text-3xl font-semibold text-slate-800">
        {eur(finalCents, locale)}
      </strong>
      <span className="text-base text-ink-soft">
        <span className="sr-only">{wasLabel} </span>
        <del>{eur(regularCents, locale)}</del>
      </span>
    </p>
  );
}

function SavingsBadge({
  regularCents,
  finalCents,
  percent,
  locale,
  label,
}: {
  regularCents: number;
  finalCents: number;
  percent: number;
  locale: Locale;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-700 px-3 py-1 text-xs font-bold text-white">
      −{percent}%
      <span className="font-semibold text-white/90">
        · {label} {eur(regularCents - finalCents, locale)}
      </span>
    </span>
  );
}

/** One discounted item: picture, name, crossed-out regular price, buy button. */
export function BlackFridayOfferCard({
  offer,
  locale,
  copy,
  earlyKey,
}: {
  offer: BlackFridayOffer;
  locale: Locale;
  copy: BlackFridayCardCopy;
  earlyKey?: string;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-card">
      <div className="relative">
        <Thumb src={offer.imageUrl} alt={offer.title} className="aspect-[4/3] w-full" />
        <div className="absolute left-4 top-4">
          <SavingsBadge
            regularCents={offer.regularCents}
            finalCents={offer.finalCents}
            percent={offer.savedPercent}
            locale={locale}
            label={copy.savingsLabel}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold leading-snug text-slate-800">
          {offer.title}
        </h3>
        {offer.description && (
          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-ink-soft">
            {offer.description}
          </p>
        )}
        <div className="mt-auto space-y-4 pt-6">
          <PriceRow
            regularCents={offer.regularCents}
            finalCents={offer.finalCents}
            locale={locale}
            wasLabel={copy.wasLabel}
          />
          <BlackFridayBuyButton
            itemKey={offer.key}
            earlyKey={earlyKey}
            locale={locale}
            label={copy.buyCta}
          />
          {offer.href && (
            <Link
              href={offer.href}
              className="block text-center text-sm font-medium text-forest-700 underline-offset-4 hover:underline"
            >
              {copy.detailsLink}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** Several items for one price, with „+“ between them and the sum crossed out. */
export function BlackFridayBundleCard({
  bundle,
  locale,
  copy,
  earlyKey,
  wide,
}: {
  bundle: BlackFridayBundleOffer;
  locale: Locale;
  copy: BlackFridayCardCopy;
  earlyKey?: string;
  wide: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-3xl border-2 border-gold-400 bg-white shadow-card ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <div className={`grid gap-0 ${wide ? "md:grid-cols-[1.25fr_1fr]" : ""}`}>
        <div className="bg-cream p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {bundle.badge && (
              <span className="rounded-full bg-forest-900 px-3 py-1 text-xs font-bold text-white">
                {bundle.badge}
              </span>
            )}
            <SavingsBadge
              regularCents={bundle.regularCents}
              finalCents={bundle.finalCents}
              percent={bundle.savedPercent}
              locale={locale}
              label={copy.savingsLabel}
            />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-forest-700">
            {copy.includedLabel}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {bundle.items.map((item, index) => (
              <li key={item.key}>
                {index > 0 && (
                  <span
                    aria-hidden
                    className="mx-auto my-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold-400 text-forest-900"
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                )}
                <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 pr-4">
                  <Thumb
                    src={item.imageUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="line-clamp-2 text-sm font-semibold text-slate-800 hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                        {item.title}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-ink-soft">
                    <span className="sr-only">{copy.wasLabel} </span>
                    {eur(item.regularCents, locale)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <h3 className="font-display text-2xl font-semibold leading-snug text-slate-800">
            {bundle.title}
          </h3>
          {bundle.description && (
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink-soft">
              {bundle.description}
            </p>
          )}
          <div className="mt-auto space-y-4 pt-6">
            <p className="text-sm text-ink-soft">
              {copy.separatelyLabel}: <del>{eur(bundle.regularCents, locale)}</del>
            </p>
            <p className="font-display text-4xl font-semibold text-slate-800">
              {eur(bundle.finalCents, locale)}
            </p>
            <BlackFridayBuyButton
              bundleId={bundle.id}
              earlyKey={earlyKey}
              locale={locale}
              label={copy.bundleCta}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
