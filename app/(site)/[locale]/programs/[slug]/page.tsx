import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/config";
import {
  PROGRAM_LANDING_SLUGS,
  PROGRAM_PUBLIC_SLUGS,
  programPath,
  resolveProgramSlug,
} from "@/lib/programs/types";
import { getPricedProgramLanding } from "@/lib/programs/priced";
import { getCtaPlacements } from "@/lib/site/content";
import type { SiteCtaPlacement } from "@/lib/supabase/types";
import { ProgramLanding } from "@/components/site/program-landing";
import { MetaViewContent } from "@/components/site/meta-view-content";
import { siteConfig, publicSiteOrigin } from "@/lib/site";

async function ctaPlacementsByKey(): Promise<Record<string, SiteCtaPlacement>> {
  const rows = await getCtaPlacements();
  return Object.fromEntries(rows.map((p) => [p.key, p]));
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    PROGRAM_LANDING_SLUGS.map((id) => ({ locale, slug: PROGRAM_PUBLIC_SLUGS[id] })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const id = resolveProgramSlug(slug);
  // The description quotes the price too, so it comes from Stripe as well.
  const content = id
    ? await getPricedProgramLanding(locale, id, await ctaPlacementsByKey())
    : null;
  if (!id || !content) return { title: "Not found" };

  const origin = publicSiteOrigin();
  const url = `${origin}/${locale}${programPath(id)}`;

  return {
    title: content.meta.title,
    description: content.meta.description,
    // A programme that is not on sale yet stays reachable by link, but out of
    // search — nobody should land on it from Google before its buttons work.
    robots: content.noindex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title: content.meta.title,
      description: content.meta.description,
      url,
      images: [{ url: siteConfig.ogImage }],
    },
  };
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const id = resolveProgramSlug(slug);
  if (!id) notFound();
  // The long id and retired names still open the programme — old links, ads
  // and emails carry them — but land on the short address.
  if (slug !== PROGRAM_PUBLIC_SLUGS[id]) {
    redirect(`/${locale}${programPath(id)}`);
  }
  const ctaPlacements = await ctaPlacementsByKey();
  const content = await getPricedProgramLanding(locale as Locale, id, ctaPlacements);
  if (!content) notFound();

  return (
    <>
      <MetaViewContent
        contentIds={[slug]}
        contentName={content.meta.title}
        contentCategory="program"
      />
      <ProgramLanding
        content={content}
        locale={locale as Locale}
        ctaPlacements={ctaPlacements}
      />
    </>
  );
}
