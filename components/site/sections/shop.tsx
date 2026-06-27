import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { SiteProduct, SiteSection } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

export function ShopSection({
  dict,
  locale,
  section,
  products,
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  products: SiteProduct[];
}) {
  if (products.length === 0) return null;

  const title =
    locale === "bg"
      ? section.title_bg || dict.shop.title
      : section.title_en || dict.shop.title;

  return (
    <section id="shop" className="scroll-mt-24 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-coral-500">
            <ShoppingBag className="h-4 w-4" /> {dict.shop.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{dict.shop.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const productTitle = locale === "bg" ? product.title_bg : product.title_en;
            const description =
              locale === "bg" ? product.description_bg : product.description_en;
            const price =
              locale === "bg" ? product.price_label_bg : product.price_label_en;

            return (
              <Link
                key={product.id}
                href={product.stripe_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-bg-card transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-coral-100">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={productTitle}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-coral-400 to-coral-600 font-display text-xl text-white/90">
                      {dict.shop.eyebrow}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  {price && (
                    <p className="font-display text-2xl font-semibold text-coral-500">
                      {price}
                    </p>
                  )}
                  <span
                    className={cn(
                      "mb-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      (product.offer_type ?? "upsell") === "downsell"
                        ? "bg-gold-400/20 text-gold-700"
                        : "bg-coral-500/15 text-coral-600",
                    )}
                  >
                    {product.offer_type ?? "upsell"}
                  </span>
                  <h3 className="mt-2 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-coral-600">
                    {productTitle}
                  </h3>
                  {description && (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                      {description}
                    </p>
                  )}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600">
                    {dict.shop.cta} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
