import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct, SiteSection } from "@/lib/supabase/types";
import { CardImage } from "@/components/site/card-image";
import { PriceTag } from "@/components/site/price-tag";
import { productButtonHref } from "@/lib/site/share-links";
import { externalLinkProps, leavesSite } from "@/lib/site/external-link";
import { filterProductsForLocale } from "@/lib/site/product-locale";
import { cn } from "@/lib/utils";

/**
 * Shop products under the programme cards, as a quiet „also available“ shelf:
 * smaller than the cards, so the main paths stay the choice. The page passes
 * only products that are not already a programme card.
 */
export function MorePrograms({
  locale,
  section,
  products,
  fallbackTitle,
  wasLabel,
  cta,
}: {
  locale: Locale;
  section: SiteSection;
  products: SiteProduct[];
  fallbackTitle: string;
  wasLabel: string;
  /** Button text for a product that has none of its own. */
  cta: string;
}) {
  const visible = filterProductsForLocale(products, locale);
  if (visible.length === 0) return null;

  const title =
    (locale === "bg" ? section.title_bg : section.title_en)?.trim() || fallbackTitle;

  return (
    <div id="shop" className="mx-auto mt-16 max-w-4xl scroll-mt-24">
      {/* Older links and emails used #products */}
      <div id="products" className="sr-only" />
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-px flex-1 bg-forest-100" />
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {title}
        </h3>
        <span aria-hidden className="h-px flex-1 bg-forest-100" />
      </div>
      <ul
        className={cn(
          "mx-auto mt-6 grid gap-4",
          visible.length === 1 ? "max-w-xl" : "sm:grid-cols-2",
        )}
      >
        {visible.map((product) => {
          const en = locale === "en";
          const productTitle = (en ? product.title_en.trim() : "") || product.title_bg;
          const description = (en ? product.description_en : product.description_bg).trim();
          const price = en ? product.price_label_en : product.price_label_bg;
          const label = (en ? product.cta_label_en : product.cta_label_bg).trim() || cta;
          const href = productButtonHref(product, locale);
          // Straight to Stripe or a custom link leaves the site in a new tab.
          const Card = leavesSite(href) ? "a" : Link;

          return (
            <li key={product.id}>
              <Card
                href={href}
                {...externalLinkProps(href)}
                className="group flex h-full gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-forest-100 transition-shadow hover:shadow-soft"
              >
                {product.image_url ? (
                  <CardImage
                    src={product.image_url}
                    alt=""
                    sizes="112px"
                    className="aspect-[4/5] w-24 shrink-0 self-start rounded-xl sm:w-28"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="aspect-[4/5] w-24 shrink-0 self-start rounded-xl bg-gradient-to-br from-forest-300 to-forest-500 sm:w-28"
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-display text-lg font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-700">
                    {productTitle}
                  </p>
                  {description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                      {description}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-3">
                    {price ? <PriceTag label={price} wasLabel={wasLabel} size="sm" /> : <span />}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600">
                      {label}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
