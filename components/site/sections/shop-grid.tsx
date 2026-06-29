"use client";

import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteProduct } from "@/lib/supabase/types";
import { productPlacementKey } from "@/lib/site/product-placement";
import { useOfferPopup } from "@/components/site/offer-popup";

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
  const { tryOpenPlacement } = useOfferPopup();

  if (products.length === 0) return null;

  function openProduct(product: SiteProduct) {
    const checkoutUrl = product.stripe_url?.trim() ?? "";
    if (!checkoutUrl) return;
    const placementKey = productPlacementKey(product.id);
    if (!tryOpenPlacement(placementKey, checkoutUrl, product)) {
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const productTitle = locale === "bg" ? product.title_bg : product.title_en;
        const description =
          locale === "bg" ? product.description_bg : product.description_en;
        const price =
          locale === "bg" ? product.price_label_bg : product.price_label_en;
        const checkoutUrl = product.stripe_url?.trim() ?? "";

        return (
          <button
            key={product.id}
            type="button"
            onClick={() => openProduct(product)}
            disabled={!checkoutUrl}
            className="group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bg-card text-left transition-all hover:-translate-y-1 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-green-100">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={productTitle}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-green-700 font-display text-xl text-white/90">
                  {shopEyebrow}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-6">
              {price && (
                <p className="font-display text-2xl font-semibold text-green-600">
                  {price}
                </p>
              )}
              <h3 className="mt-2 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-green-600">
                {productTitle}
              </h3>
              {description && (
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                  {description}
                </p>
              )}
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                {shopCta} <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
