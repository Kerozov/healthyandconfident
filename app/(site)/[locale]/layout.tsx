import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import { geistSans, fraunces } from "@/app/fonts";
import { locales, isLocale, localeHtmlLang, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent } from "@/lib/site/content";
import { getSiteContactConfig } from "@/lib/site/contact-config";
import {
  getMetaPixelConfig,
  getMetaPixelPublicConfig,
  metaDomainVerification,
} from "@/lib/meta/config";
import { siteConfig, publicSiteOrigin } from "@/lib/site";
import { MetaPixel } from "@/components/site/meta-pixel";
import { SiteHeader } from "@/components/site/site-header";
import { Footer } from "@/components/site/footer";
import { MessengerWidget } from "@/components/site/messenger-widget";
import { Popup } from "@/components/site/popup";
import { CheckoutNotice } from "@/components/site/checkout-notice";
import { SiteAnalytics } from "@/components/site/site-analytics";
import { MenuPopupProvider } from "@/components/site/menu-popup";
import { HashScroll } from "@/components/site/hash-scroll";
import { OfferPopupProvider } from "@/components/site/offer-popup";

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

  const origin = publicSiteOrigin();
  // Meta refuses to run ads to a domain it cannot verify.
  const domainVerification = metaDomainVerification(await getMetaPixelConfig());

  return {
    metadataBase: new URL(origin),
    title: {
      default: dict.meta.title,
      template: `%s · ${siteConfig.brand}`,
    },
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: siteConfig.brand }],
    alternates: {
      canonical: `${origin}/${locale}`,
      languages: {
        bg: "/bg",
        en: "/en",
        "x-default": "/bg",
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "bg" ? "bg_BG" : "en_GB",
      url: `${origin}/${locale}`,
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
    ...(domainVerification
      ? { verification: { other: { "facebook-domain-verification": domainVerification } } }
      : {}),
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
  const [dict, site, contactConfig, metaPixel] = await Promise.all([
    getDictionary(l),
    getPublicSiteContent(),
    getSiteContactConfig(),
    getMetaPixelPublicConfig(),
  ]);

  return (
    <html
      lang={localeHtmlLang[l]}
      className={`${geistSans.variable} ${fraunces.variable}`}
    >
      <body className="min-h-screen pb-[env(safe-area-inset-bottom)]">
        <OfferPopupProvider
          placements={site.ctaPlacements}
          offersById={site.offersById}
          locale={l}
        >
          <MenuPopupProvider
            locale={l}
            copy={{
              title: dict.leadMagnet.title,
              subtitle: dict.leadMagnet.subtitle,
              button: dict.leadMagnet.button,
              consent: dict.leadMagnet.consent,
              success: dict.leadMagnet.success,
            }}
          >
            <HashScroll />
            <SiteHeader locale={l} items={dict.nav.items} cta={dict.nav.cta} />
            <main>{children}</main>
            <Footer locale={l} dict={dict} contactConfig={contactConfig} />
            {contactConfig.messenger_enabled && contactConfig.messenger_url.trim() && (
              <MessengerWidget
                url={contactConfig.messenger_url}
                label={dict.contact.messengerText}
              />
            )}
            <Popup locale={l} />
            <Suspense fallback={null}>
              <CheckoutNotice locale={l} />
            </Suspense>
            <Suspense fallback={null}>
              <SiteAnalytics />
            </Suspense>
            <MetaPixel config={metaPixel} />
          </MenuPopupProvider>
        </OfferPopupProvider>
      </body>
    </html>
  );
}
