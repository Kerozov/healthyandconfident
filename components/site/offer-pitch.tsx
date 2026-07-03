import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { resolveOfferCta, resolveOfferHeadline } from "@/lib/site/cta-placements";
import { cn } from "@/lib/utils";

export function OfferPitch({
  offer,
  locale,
  headline,
  compact = false,
  className,
}: {
  offer: SiteProduct;
  locale: Locale;
  headline?: string;
  compact?: boolean;
  className?: string;
}) {
  const title = locale === "bg" ? offer.title_bg : offer.title_en;
  const description = locale === "bg" ? offer.description_bg : offer.description_en;
  const price = locale === "bg" ? offer.price_label_bg : offer.price_label_en;
  const pitch = resolveOfferHeadline(locale, offer, headline);
  const cta = resolveOfferCta(locale, offer);
  const checkoutUrl = offer.stripe_url?.trim() ?? "";

  return (
    <div
      className={cn(
        "rounded-2xl border border-forest-200/50 bg-cream p-4",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-forest-500">
        <Sparkles className="h-3.5 w-3.5" />
        {pitch}
      </p>

      <div className={cn("mt-3", compact ? "flex items-center justify-between gap-3" : "space-y-2")}>
        <div className={compact ? "min-w-0 flex-1" : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base font-semibold leading-snug">{title}</p>
            {price && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-forest-600">
                {price}
              </span>
            )}
          </div>
          {!compact && description && (
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{description}</p>
          )}
        </div>

        {checkoutUrl ? (
          <Link
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gold-400 px-4 py-2 text-sm font-semibold text-forest-900 transition-colors hover:bg-gold-500",
              compact && "text-xs",
            )}
          >
            {cta}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full bg-ink/10 px-4 py-2 text-sm font-semibold text-ink-soft",
              compact && "text-xs",
            )}
          >
            {locale === "bg" ? "Линк скоро" : "Link soon"}
          </span>
        )}
      </div>
    </div>
  );
}
