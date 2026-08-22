import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getSiteProducts } from "@/lib/site/content";
import { filterProductsForLocale } from "@/lib/site/product-locale";
import { productsListPath } from "@/lib/site/product-placement";
import { CatalogIndex } from "@/components/site/catalog-index";
import { ShopProductGrid } from "@/components/site/sections/shop-grid";
import { publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  const origin = publicSiteOrigin();

  return {
    title: dict.shop.title,
    description: dict.shop.subtitle,
    alternates: {
      canonical: `${origin}${productsListPath(locale)}`,
      languages: {
        bg: "/bg/products",
        en: "/en/products",
      },
    },
  };
}

export default async function ProductsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const products = filterProductsForLocale(await getSiteProducts(), l);
  const empty =
    products.length === 0
      ? l === "bg"
        ? "В момента няма продукти за показване."
        : "There are no products to show right now."
      : undefined;

  return (
    <CatalogIndex
      locale={l}
      eyebrow={dict.shop.eyebrow}
      title={dict.shop.title}
      subtitle={dict.shop.subtitle}
      empty={empty}
    >
      <ShopProductGrid
        products={products}
        locale={l}
        shopEyebrow={dict.shop.eyebrow}
        shopCta={dict.shop.cta}
      />
    </CatalogIndex>
  );
}
