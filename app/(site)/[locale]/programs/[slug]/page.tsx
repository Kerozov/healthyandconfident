import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { PROGRAM_LANDING_SLUGS } from "@/lib/programs/types";
import { getProgramLanding } from "@/lib/programs/landings";
import { ProgramLanding } from "@/components/site/program-landing";
import { siteConfig } from "@/lib/site";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    PROGRAM_LANDING_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const content = getProgramLanding(locale, slug);
  if (!content) return { title: "Not found" };

  return {
    title: content.meta.title,
    description: content.meta.description,
    alternates: {
      canonical: `${siteConfig.domain}/${locale}/programs/${slug}`,
    },
    openGraph: {
      type: "website",
      title: content.meta.title,
      description: content.meta.description,
      url: `${siteConfig.domain}/${locale}/programs/${slug}`,
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
  if (slug === "balansirano-hranene-21") {
    redirect(`/${locale}/programs/garnituri`);
  }
  const content = getProgramLanding(locale as Locale, slug);
  if (!content) notFound();

  return <ProgramLanding content={content} locale={locale as Locale} />;
}
