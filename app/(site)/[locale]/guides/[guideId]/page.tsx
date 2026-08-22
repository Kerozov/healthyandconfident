import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getSiteGuides } from "@/lib/site/content";
import { GuideCheckoutCard } from "@/components/site/guide-checkout-card";
import { MetaViewContent } from "@/components/site/meta-view-content";
import { CatalogDetailShell } from "@/components/site/catalog-detail";
import { guidePagePath, guidesListPath } from "@/lib/site/product-placement";
import { guideVisible } from "@/lib/site/guide-catalog";
import { siteConfig, publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

async function findGuide(guideId: string) {
  const guides = await getSiteGuides(true);
  return guides.find((g) => g.id.toLowerCase() === guideId.toLowerCase()) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; guideId: string }>;
}): Promise<Metadata> {
  const { locale, guideId } = await params;
  if (!isLocale(locale)) return {};
  const guide = await findGuide(guideId);
  if (!guide) return { robots: { index: false, follow: false } };

  const l = locale as Locale;
  const title = l === "en" ? guide.title_en : guide.title_bg;
  const description =
    l === "en" ? guide.description_en : guide.description_bg;
  const origin = publicSiteOrigin();
  const path = guidePagePath(guide.id, l);

  return {
    title,
    description: description || undefined,
    robots: guideVisible(guide)
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
      images: guide.image_url
        ? [{ url: guide.image_url }]
        : [{ url: siteConfig.ogImage }],
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; guideId: string }>;
}) {
  const { locale, guideId } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;

  const guide = await findGuide(guideId);
  if (!guide) notFound();

  const listHref = guidesListPath(l);
  const backLabel = l === "bg" ? "Към всички ръководства" : "All guides";

  return (
    <CatalogDetailShell backHref={listHref} backLabel={backLabel}>
      <MetaViewContent
        contentIds={[guide.id]}
        contentName={l === "en" ? guide.title_en : guide.title_bg}
        contentCategory="guide"
      />
      <GuideCheckoutCard guide={guide} locale={l} />
    </CatalogDetailShell>
  );
}
