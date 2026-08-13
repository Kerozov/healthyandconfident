import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getSiteProducts } from "@/lib/site/content";
import { ProductCheckoutCard } from "@/components/site/product-checkout-card";
import { MetaViewContent } from "@/components/site/meta-view-content";

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

  const title = locale === "en" ? product.title_en : product.title_bg;
  const description =
    locale === "en" ? product.description_en : product.description_bg;

  return {
    title,
    description: description || undefined,
    // A per-recipient purchase link has no business in search results.
    robots: { index: false, follow: false },
  };
}

export default async function ProductCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;

  const product = await findProduct(productId);
  if (!product) notFound();

  return (
    <div className="bg-cream py-14 sm:py-20">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <Link
          href={`/${l}#products`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 hover:text-forest-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {l === "bg" ? "Към всички продукти" : "All products"}
        </Link>

        <div className="mt-5">
          {product.enabled ? (
            <>
              <MetaViewContent
                contentIds={[product.id]}
                contentName={locale === "en" ? product.title_en : product.title_bg}
                contentCategory="product"
              />
              <ProductCheckoutCard product={product} locale={l} />
            </>
          ) : (
            <div className="rounded-3xl border border-forest-100 bg-white p-8 text-center shadow-card">
              <h1 className="font-display text-2xl font-semibold text-slate-800">
                {l === "bg" ? "Продуктът вече не е активен" : "This product is no longer available"}
              </h1>
              <p className="mt-3 text-sm text-ink-soft">
                {l === "bg"
                  ? "Виж останалите програми или ни пиши — ще ти предложим подходящото."
                  : "Take a look at the other programmes, or get in touch and we will point you to the right one."}
              </p>
              <Link
                href={`/${l}#products`}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-gold-400 px-7 text-sm font-bold text-forest-900 hover:bg-gold-500"
              >
                {l === "bg" ? "Виж програмите" : "View programmes"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
