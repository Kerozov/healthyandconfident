"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Segment, SiteProduct } from "@/lib/supabase/types";
import { offerMatchesVisitor } from "@/lib/site/audience";
import { readVisitorTags } from "@/lib/site/visitor-tags";
import { cn } from "@/lib/utils";

export function ShopProductGrid({
  products,
  segments,
  locale,
  shopEyebrow,
  shopCta,
}: {
  products: SiteProduct[];
  segments: Segment[];
  locale: Locale;
  shopEyebrow: string;
  shopCta: string;
}) {
  const [visitorTags, setVisitorTags] = useState<string[]>([]);

  useEffect(() => {
    setVisitorTags(readVisitorTags());
  }, []);

  const visible = useMemo(
    () => products.filter((p) => offerMatchesVisitor(p, visitorTags, segments)),
    [products, visitorTags, segments],
  );

  if (visible.length === 0) return null;

  return (
    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((product) => {
        const productTitle = locale === "bg" ? product.title_bg : product.title_en;
        const description =
          locale === "bg" ? product.description_bg : product.description_en;
        const price =
          locale === "bg" ? product.price_label_bg : product.price_label_en;
        const checkoutUrl = product.stripe_url?.trim() ?? "";

        return (
          <div
            key={product.id}
            className="group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bg-card transition-all hover:-translate-y-1 hover:shadow-soft"
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
              <span
                className={cn(
                  "mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  (product.offer_type ?? "upsell") === "downsell"
                    ? "bg-gold-400/20 text-gold-700"
                    : "bg-green-500/15 text-green-600",
                )}
              >
                {product.offer_type ?? "upsell"}
              </span>
              <h3 className="mt-2 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-green-600">
                {productTitle}
              </h3>
              {description && (
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                  {description}
                </p>
              )}
              {checkoutUrl ? (
                <Link
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600"
                >
                  {shopCta} <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="mt-5 text-sm text-ink-soft">
                  {locale === "bg" ? "Линк скоро" : "Link soon"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
