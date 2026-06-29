"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Program } from "@/i18n/types";
import type { SiteProduct } from "@/lib/supabase/types";
import { productPlacementKey } from "@/lib/site/product-placement";
import { useOfferPopup } from "@/components/site/offer-popup";
import { cn } from "@/lib/utils";

function ShowcaseCardShell({
  image,
  imageAlt,
  discountBadge,
  cta,
  onCtaClick,
  href,
  external,
  footerLines,
  disabled,
  className,
}: {
  image?: string | null;
  imageAlt: string;
  discountBadge?: string;
  cta: string;
  onCtaClick?: (e: React.MouseEvent) => void;
  href?: string;
  external?: boolean;
  footerLines: string[];
  disabled?: boolean;
  className?: string;
}) {
  const ctaClass = cn(
    "inline-block rounded-xl bg-forest-700 px-5 py-2.5 text-center font-display text-base font-semibold italic text-white shadow-md transition-colors hover:bg-forest-800",
    disabled && "pointer-events-none opacity-50",
  );

  const ctaNode = href ? (
    external ? (
      <a href={href} className={ctaClass} onClick={onCtaClick}>
        {cta}
      </a>
    ) : (
      <Link href={href} className={ctaClass} onClick={onCtaClick}>
        {cta}
      </Link>
    )
  ) : (
    <button type="button" className={ctaClass} onClick={onCtaClick}>
      {cta}
    </button>
  );

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-green-100 bg-cream-100 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-green-100">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={imageAlt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-green-700 px-4 text-center font-display text-lg text-white/90">
            {imageAlt}
          </div>
        )}
        {discountBadge && (
          <span className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white shadow">
            {discountBadge}
          </span>
        )}
      </div>

      <div className="relative z-10 -mt-5 flex justify-center px-3">{ctaNode}</div>

      <div className="flex flex-1 flex-col justify-center px-4 pb-5 pt-4 text-center text-sm leading-relaxed text-forest-800">
        {footerLines.map((line, i) => (
          <p key={i} className={cn(i > 0 && "mt-1")}>
            {line}
          </p>
        ))}
      </div>
    </article>
  );
}

export function ProgramsShowcaseGrid({
  items,
  products,
  locale,
}: {
  items: Program[];
  products: SiteProduct[];
  locale: Locale;
}) {
  const { tryOpenPlacement } = useOfferPopup();

  return (
    <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((p, index) => {
        const href = p.href.startsWith("#")
          ? `/${locale}${p.href}`
          : `/${locale}${p.href}`;
        const external = p.href.startsWith("http");

        return (
          <ShowcaseCardShell
            key={p.title}
            image={p.image}
            imageAlt={p.title}
            discountBadge={p.discountBadge}
            cta={p.cta}
            href={external ? p.href : href}
            external={external}
            onCtaClick={(e) => {
              if (tryOpenPlacement(`programs_${index}`, external ? p.href : href)) {
                e.preventDefault();
              }
            }}
            footerLines={
              p.footerLines ?? [p.title, p.description]
            }
          />
        );
      })}

      {products.map((product) => {
        const title = locale === "bg" ? product.title_bg : product.title_en;
        const description =
          locale === "bg" ? product.description_bg : product.description_en;
        const price =
          locale === "bg" ? product.price_label_bg : product.price_label_en;
        const ctaLabel =
          (locale === "bg" ? product.cta_label_bg : product.cta_label_en)?.trim() ||
          (locale === "bg" ? `Купи от тук – ${price}` : `Buy here – ${price}`);
        const checkoutUrl = product.stripe_url?.trim() ?? "";
        const placementKey = productPlacementKey(product.id);

        const footerLines = [title];
        if (description) footerLines.push(description);
        if (price) footerLines.push(price);

        return (
          <ShowcaseCardShell
            key={product.id}
            image={product.image_url}
            imageAlt={title}
            cta={ctaLabel}
            footerLines={footerLines}
            disabled={!checkoutUrl}
            onCtaClick={() => {
              if (!checkoutUrl) return;
              if (!tryOpenPlacement(placementKey, checkoutUrl, product)) {
                window.open(checkoutUrl, "_blank", "noopener,noreferrer");
              }
            }}
          />
        );
      })}
    </div>
  );
}
