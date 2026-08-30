import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { LegalDocument } from "@/components/site/legal-document";
import { publicSiteOrigin } from "@/lib/site";
import { legalPath } from "@/lib/site/legal";

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
    title: dict.legal.privacy.title,
    description: dict.legal.privacy.description,
    alternates: {
      canonical: `${origin}${legalPath(locale, "privacy")}`,
      languages: {
        bg: "/bg/privacy",
        en: "/en/privacy",
      },
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  return <LegalDocument locale={l} dict={getDictionary(l)} slug="privacy" />;
}
