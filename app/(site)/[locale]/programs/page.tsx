import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { Programs } from "@/components/site/sections/programs";
import { getSiteProgramCards } from "@/lib/site/content";
import { programsListPath } from "@/lib/site/product-placement";
import { publicSiteOrigin } from "@/lib/site";

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
    title: dict.programs.title,
    description: dict.programs.subtitle,
    alternates: {
      canonical: `${origin}${programsListPath(locale)}`,
      languages: {
        bg: "/bg/programs",
        en: "/en/programs",
      },
    },
  };
}

export default async function ProgramsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const dict = getDictionary(l);
  // No section toggle here: that switch hides the block on the home page, not
  // this page, which is the programme list itself.
  const cards = await getSiteProgramCards();

  return (
    <div className="bg-cream pt-6">
      <Programs dict={dict} locale={l} cards={cards} />
    </div>
  );
}
