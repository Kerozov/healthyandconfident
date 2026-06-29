import type { SiteProduct, SiteSection, Segment } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { ShoppingBag } from "lucide-react";
import { ShopProductGrid } from "@/components/site/sections/shop-grid";

export function ShopSection({
  dict,
  locale,
  section,
  products,
  segments,
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  products: SiteProduct[];
  segments: Segment[];
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
          <span className="eyebrow text-green-600">
            <ShoppingBag className="h-4 w-4" /> {dict.shop.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{dict.shop.subtitle}</p>
        </div>

        <ShopProductGrid
          products={products}
          segments={segments}
          locale={locale}
          shopEyebrow={dict.shop.eyebrow}
          shopCta={dict.shop.cta}
        />
      </Container>
    </section>
  );
}
