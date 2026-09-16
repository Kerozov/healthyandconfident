import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getSiteGuides } from "@/lib/site/content";
import { GuideCheckoutCard } from "@/components/site/guide-checkout-card";
import { MetaViewContent } from "@/components/site/meta-view-content";
import {
  CatalogDetailShell,
  CatalogUnavailable,
} from "@/components/site/catalog-detail";
import { guidePagePath, guidesListPath } from "@/lib/site/product-placement";
import { guideVisibleInLocale } from "@/lib/site/guide-catalog";
import { safeDecodeRef } from "@/lib/site/share-links";
import { siteConfig, publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * The segment may be the guide's slug or its id — every link we ever published
 * carries the id, so both have to resolve. A slug is never a uuid, so matching
 * slugs first cannot shadow a row addressed by id.
 */
async function findGuide(ref: string) {
  const guides = await getSiteGuides(true);
  const wanted = safeDecodeRef(ref).toLowerCase();
  return (
    guides.find((g) => (g.slug?.trim().toLowerCase() ?? "") === wanted) ??
    guides.find((g) => g.id.toLowerCase() === wanted) ??
    null
  );
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
  const path = guidePagePath(guide, l);

  return {
    title,
    description: description || undefined,
    robots: guideVisibleInLocale(guide, l)
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
      {!guideVisibleInLocale(guide, l) ? (
        <CatalogUnavailable
          locale={l}
          backHref={listHref}
          backLabel={backLabel}
        />
      ) : (
        <>
          <MetaViewContent
            contentIds={[guide.id]}
            contentName={l === "en" ? guide.title_en : guide.title_bg}
            contentCategory="guide"
          />
          <GuideCheckoutCard guide={guide} locale={l} />
        </>
      )}
    </CatalogDetailShell>
  );
}
