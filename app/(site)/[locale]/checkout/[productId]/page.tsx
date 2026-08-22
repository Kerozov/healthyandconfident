import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { productCheckoutPath } from "@/lib/site/product-placement";

export const dynamic = "force-dynamic";

/** Old email and ad links used /checkout/[id]. Keep them working. */
export default async function LegacyProductCheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isLocale(locale)) notFound();
  redirect(productCheckoutPath(productId, locale as Locale));
}
