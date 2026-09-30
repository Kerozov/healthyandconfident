import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent } from "@/lib/site/content";
import { getSiteContactConfig } from "@/lib/site/contact-config";
import { EventsStrip } from "@/components/site/sections/events-strip";
import { Hero } from "@/components/site/sections/hero";
import { ProofStrip } from "@/components/site/sections/proof-strip";
import { Programs } from "@/components/site/sections/programs";
import { MorePrograms } from "@/components/site/sections/more-programs";
import { GuidesSection } from "@/components/site/sections/guides";
import { Results } from "@/components/site/sections/results";
import { Audience } from "@/components/site/sections/audience";
import { Method } from "@/components/site/sections/method";
import { About } from "@/components/site/sections/about";
import { Faq } from "@/components/site/sections/faq";
import { FinalCta } from "@/components/site/sections/final-cta";
import { StickyCta } from "@/components/site/sticky-cta";
import { HomeJsonLd } from "@/components/seo/json-ld";

/**
 * The home page is a sales page, in the order a stranger needs it: the promise
 * and who it is for, proof in numbers, the offers, then everything that answers
 * „will it work for me?“ — before and after, method, who Vessie is, questions —
 * and a close that keeps even the not-yet-ready in touch with a free menu.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const [dict, site, contactConfig] = await Promise.all([
    getDictionary(l),
    getPublicSiteContent(),
    getSiteContactConfig(),
  ]);
  const productsSection = site.sections.products;
  const guidesSection = site.sections.guides;

  return (
    <>
      <HomeJsonLd dict={dict} locale={l} />
      {site.events.length > 0 && (
        <EventsStrip
          dict={dict}
          locale={l}
          events={site.events}
          offersById={site.offersById}
        />
      )}
      <Hero dict={dict} locale={l} />
      <ProofStrip dict={dict} />
      <Programs
        dict={dict}
        locale={l}
        section={site.sections.programs}
        cards={site.programCards}
      >
        {productsSection && site.products.length > 0 ? (
          <MorePrograms
            locale={l}
            section={productsSection}
            products={site.products}
            fallbackTitle={dict.programs.moreTitle}
            wasLabel={dict.programs.wasLabel}
          />
        ) : (
          <div id="shop" className="sr-only" />
        )}
      </Programs>
      {guidesSection && site.guides.length > 0 && (
        <GuidesSection
          dict={dict}
          locale={l}
          section={guidesSection}
          guides={site.guides}
        />
      )}
      <Results
        dict={dict}
        locale={l}
        videosSection={site.sections.videos}
        videos={site.videos}
      />
      <Audience dict={dict} locale={l} />
      <Method dict={dict} locale={l} />
      <About dict={dict} locale={l} />
      <Faq dict={dict} locale={l} />
      <FinalCta dict={dict} locale={l} contactConfig={contactConfig} />
      <StickyCta
        locale={l}
        label={dict.stickyCta.label}
        leaveRoomForChat={
          contactConfig.messenger_enabled && Boolean(contactConfig.messenger_url.trim())
        }
      />
    </>
  );
}
