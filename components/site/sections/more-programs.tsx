import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct, SiteSection } from "@/lib/supabase/types";
import { CardImage } from "@/components/site/card-image";
import { PriceTag } from "@/components/site/price-tag";
import { productButtonHref } from "@/lib/site/share-links";
import { externalLinkProps, leavesSite } from "@/lib/site/external-link";
import { filterProductsForLocale } from "@/lib/site/product-locale";

/**
 * Shop products as a compact row under the programme cards. They are sold on
 * the home page too, but kept small so the three main paths stay the choice.
 */
export function MorePrograms({
  locale,
  section,
  products,
  fallbackTitle,
  wasLabel,
}: {
  locale: Locale;
  section: SiteSection;
  products: SiteProduct[];
  fallbackTitle: string;
  wasLabel: string;
}) {
  const visible = filterProductsForLocale(products, locale);
  if (visible.length === 0) return null;

  const title =
    (locale === "bg" ? section.title_bg : section.title_en)?.trim() || fallbackTitle;

  return (
    <div id="shop" className="mx-auto mt-12 max-w-4xl scroll-mt-24">
      {/* Older links and emails used #products */}
      <div id="products" className="sr-only" />
      <h3 className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {title}
      </h3>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((product) => {
          const productTitle = locale === "bg" ? product.title_bg : product.title_en;
          const price = locale === "bg" ? product.price_label_bg : product.price_label_en;
          const href = productButtonHref(product, locale);
          // Straight to Stripe or a custom link leaves the site in a new tab.
          const Card = leavesSite(href) ? "a" : Link;

          return (
            <li key={product.id}>
              <Card
                href={href}
                {...externalLinkProps(href)}
                className="group flex h-full items-center gap-4 rounded-2xl bg-white p-3 pr-4 ring-1 ring-forest-100 transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                {product.image_url ? (
                  <CardImage
                    src={product.image_url}
                    alt=""
                    sizes="80px"
                    className="h-20 w-20 shrink-0 rounded-xl"
                  />
                ) : (
                  <span aria-hidden className="h-20 w-20 shrink-0 rounded-xl bg-gradient-to-br from-forest-300 to-forest-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-display text-base font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-600">
                    {productTitle}
                  </p>
                  {price && <PriceTag label={price} wasLabel={wasLabel} size="sm" className="mt-1.5" />}
                </div>
                <ArrowUpRight
                  className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
