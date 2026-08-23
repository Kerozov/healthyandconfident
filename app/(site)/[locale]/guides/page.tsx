import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getSiteGuides } from "@/lib/site/content";
import { filterGuidesForLocale } from "@/lib/site/guide-catalog";
import { guidesListPath } from "@/lib/site/product-placement";
import { CatalogIndex } from "@/components/site/catalog-index";
import { GuidesGrid } from "@/components/site/sections/guides-grid";
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
    title: dict.guides.title,
    description: dict.guides.subtitle,
    alternates: {
      canonical: `${origin}${guidesListPath(locale)}`,
      languages: {
        bg: "/bg/guides",
        en: "/en/guides",
      },
    },
  };
}

export default async function GuidesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  const guides = filterGuidesForLocale(await getSiteGuides(), l);
  const empty =
    guides.length === 0
      ? l === "bg"
        ? "В момента няма ръководства за показване."
        : "There are no guides to show right now."
      : undefined;

  return (
    <CatalogIndex
      locale={l}
      eyebrow={dict.guides.eyebrow}
      title={dict.guides.title}
      subtitle={dict.guides.subtitle}
      empty={empty}
    >
      <GuidesGrid guides={guides} locale={l} cta={dict.guides.cta} />
    </CatalogIndex>
  );
}
