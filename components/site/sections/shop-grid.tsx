import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { productButtonHref } from "@/lib/site/share-links";
import { externalLinkProps, leavesSite } from "@/lib/site/external-link";
import { CardImage } from "@/components/site/card-image";

export function ShopProductGrid({
  products,
  locale,
  shopEyebrow,
  shopCta,
}: {
  products: SiteProduct[];
  locale: Locale;
  shopEyebrow: string;
  shopCta: string;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const productTitle = locale === "bg" ? product.title_bg : product.title_en;
        const description =
          locale === "bg" ? product.description_bg : product.description_en;
        const price =
          locale === "bg" ? product.price_label_bg : product.price_label_en;
        const href = productButtonHref(product, locale);
        // A card that leads off the site (a custom link, or `/buy/…` straight
        // to Stripe) is a plain anchor in a new tab — no prefetch, and the
        // shop stays open behind it.
        const Card = leavesSite(href) ? "a" : Link;

        return (
          <Card
            key={product.id}
            href={href}
            {...externalLinkProps(href)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            {product.image_url ? (
              <CardImage
                src={product.image_url}
                alt={productTitle}
                className="aspect-[4/3]"
                imageClassName="transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-xl text-white/90">
                {shopEyebrow}
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              {price && (
                <p className="font-display text-2xl font-semibold text-slate-800">
                  {price}
                </p>
              )}
              <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-500">
                {productTitle}
              </h3>
              {description && (
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                  {description}
                </p>
              )}
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-500">
                {shopCta} <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
