import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteGuide } from "@/lib/supabase/types";
import { guideButtonHref } from "@/lib/site/share-links";
import { externalLinkProps, leavesSite } from "@/lib/site/external-link";
import { CardImage } from "@/components/site/card-image";
import { PriceTag } from "@/components/site/price-tag";

export function GuidesGrid({
  guides,
  locale,
  cta,
  badge,
  wasLabel,
}: {
  guides: SiteGuide[];
  locale: Locale;
  cta: string;
  badge: string;
  wasLabel: string;
}) {
  if (guides.length === 0) return null;

  return (
    <div className="mt-12 grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((guide) => {
        const title = locale === "bg" ? guide.title_bg : guide.title_en;
        const description =
          locale === "bg" ? guide.description_bg : guide.description_en;
        const price =
          locale === "bg" ? guide.price_label_bg : guide.price_label_en;
        const href = guideButtonHref(guide, locale);
        // A card that leads off the site (a custom link, or `/buy/…` straight
        // to Stripe) is a plain anchor in a new tab — no prefetch, and the
        // catalogue stays open behind it.
        const Card = leavesSite(href) ? "a" : Link;

        return (
          <Card
            key={guide.id}
            href={href}
            {...externalLinkProps(href)}
            className="group flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card ring-1 ring-forest-100 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            {guide.image_url ? (
              <CardImage
                src={guide.image_url}
                alt={title}
                className="aspect-[4/3]"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-xl text-white/90">
                PDF
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                {badge}
              </span>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-600">
                {title}
              </h3>
              {description && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                  {description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                {price ? <PriceTag label={price} wasLabel={wasLabel} /> : <span />}
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-slate-700">
                  {cta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
