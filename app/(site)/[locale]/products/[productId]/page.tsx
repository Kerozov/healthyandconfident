import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getSiteProducts } from "@/lib/site/content";
import { ProductCheckoutCard } from "@/components/site/product-checkout-card";
import { MetaViewContent } from "@/components/site/meta-view-content";
import {
  CatalogDetailShell,
  CatalogUnavailable,
} from "@/components/site/catalog-detail";
import {
  productCheckoutPath,
  productsListPath,
} from "@/lib/site/product-placement";
import { productVisibleInLocale } from "@/lib/site/product-locale";
import { siteConfig, publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

async function findProduct(productId: string) {
  const products = await getSiteProducts(true);
  return products.find((p) => p.id.toLowerCase() === productId.toLowerCase()) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}): Promise<Metadata> {
  const { locale, productId } = await params;
  if (!isLocale(locale)) return {};
  const product = await findProduct(productId);
  if (!product) return { robots: { index: false, follow: false } };

  const l = locale as Locale;
  const title = l === "en" ? product.title_en : product.title_bg;
  const description =
    l === "en" ? product.description_en : product.description_bg;
  const visible = productVisibleInLocale(product, l);
  const origin = publicSiteOrigin();
  const path = productCheckoutPath(product.id, l);

  return {
    title,
    description: description || undefined,
    robots: visible
      ? { index: true, follow: true }
      : { index: false, follow: false },
    alternates: {
      canonical: `${origin}${path}`,
    },
    openGraph: {
      type: "website",
      title,
      description: description || undefined,
      url: `${origin}${path}`,
      images: product.image_url
        ? [{ url: product.image_url }]
        : [{ url: siteConfig.ogImage }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;

  const product = await findProduct(productId);
  if (!product) notFound();

  const listHref = productsListPath(l);
  const backLabel = l === "bg" ? "Към всички продукти" : "All products";

  return (
    <CatalogDetailShell backHref={listHref} backLabel={backLabel}>
      {!productVisibleInLocale(product, l) ? (
        <CatalogUnavailable
          locale={l}
          backHref={listHref}
          backLabel={l === "bg" ? "Към всички продукти" : "View programmes"}
        />
      ) : (
        <>
          <MetaViewContent
            contentIds={[product.id]}
            contentName={l === "en" ? product.title_en : product.title_bg}
            contentCategory="product"
          />
          <ProductCheckoutCard product={product} locale={l} />
        </>
      )}
    </CatalogDetailShell>
  );
}
