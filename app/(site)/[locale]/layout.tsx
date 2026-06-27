import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { geistSans, fraunces } from "@/app/fonts";
import { locales, isLocale, localeHtmlLang, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent } from "@/lib/site/content";
import { siteConfig } from "@/lib/site";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Popup } from "@/components/site/popup";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);

  return {
    metadataBase: new URL(siteConfig.domain),
    title: {
      default: dict.meta.title,
      template: `%s · ${siteConfig.brand}`,
    },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: siteConfig.brand }],
    alternates: {
      canonical: `${siteConfig.domain}/${locale}`,
      languages: {
        bg: "/bg",
        en: "/en",
        "x-default": "/bg",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "bg" ? "bg_BG" : "en_GB",
      url: `${siteConfig.domain}/${locale}`,
      siteName: siteConfig.brand,
      title: dict.meta.title,
      description: dict.meta.description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: dict.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.description,
      images: [siteConfig.ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const [dict, site] = await Promise.all([getDictionary(l), getPublicSiteContent()]);

  return (
    <html
      lang={localeHtmlLang[l]}
      className={`${geistSans.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen bg-bg-primary text-text-primary">
        <Navbar
          locale={l}
          items={dict.nav.items}
          cta={dict.nav.cta}
          placements={site.ctaPlacements}
          offersById={site.offersById}
        />
        <main>{children}</main>
        <Footer locale={l} dict={dict} />
        <Popup locale={l} />
      </body>
    </html>
  );
}
