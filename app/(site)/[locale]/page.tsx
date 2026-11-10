import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent, productsBesidePrograms } from "@/lib/site/content";
import { getSiteContactConfig } from "@/lib/site/contact-config";
import { Hero } from "@/components/site/sections/hero";
import { ProofStrip } from "@/components/site/sections/proof-strip";
import { UpcomingEvents } from "@/components/site/sections/upcoming-events";
import { Programs } from "@/components/site/sections/programs";
import { MorePrograms } from "@/components/site/sections/more-programs";
import { GuidesSection } from "@/components/site/sections/guides";
import { Audience } from "@/components/site/sections/audience";
import { Method } from "@/components/site/sections/method";
import { Results } from "@/components/site/sections/results";
import { About } from "@/components/site/sections/about";
import { Faq } from "@/components/site/sections/faq";
import { FinalCta } from "@/components/site/sections/final-cta";
import { QuestionnaireCta } from "@/components/site/sections/questionnaire-cta";
import { getSiteQuestionnaireCta } from "@/lib/site/questionnaire-cta-data";
import { questionnaireCtaForLocale, separateHomeQuestionnaire } from "@/lib/site/questionnaire-cta";
import { StickyCta } from "@/components/site/sticky-cta";
import { HomeJsonLd } from "@/components/seo/json-ld";

/**
 * The home page is a sales page: what is coming up soon (webinars to sign up
 * for) sits first, followed by the promise, proof in numbers, and the offers.
 * Visitors can then see who the programmes are for, how the method works,
 * and what clients achieved, before meeting Vessie and reading the FAQs.
 * The page closes with a free menu.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const [dict, site, contactConfig, questionnaireRow] = await Promise.all([
    getDictionary(l),
    getPublicSiteContent(),
    getSiteContactConfig(),
    getSiteQuestionnaireCta(),
  ]);
  const configuredQuestionnaire = questionnaireCtaForLocale(questionnaireRow, l);
  const { upcomingEvents, questionnaire } = separateHomeQuestionnaire(site.events, l);
  const homeQuestionnaire = configuredQuestionnaire?.showOnHome ? configuredQuestionnaire : questionnaire;
  const productsSection = site.sections.products;
  const guidesSection = site.sections.guides;
  // An offer that already has a programme card is not sold a second time below it.
  const extraProducts = productsBesidePrograms(
    site.products,
    site.programCards,
    site.ctaPlacements,
    l,
  );

  return (
    <>
      <HomeJsonLd dict={dict} locale={l} />
      {upcomingEvents.length > 0 && (
        <UpcomingEvents
          dict={dict}
          locale={l}
          section={site.sections.events}
          events={upcomingEvents}
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
        messengerUrl={contactConfig.messenger_url}
      >
        {productsSection && extraProducts.length > 0 ? (
          <MorePrograms
            locale={l}
            section={productsSection}
            products={extraProducts}
            fallbackTitle={dict.programs.moreTitle}
            wasLabel={dict.programs.wasLabel}
            cta={dict.shop.cta}
          />
        ) : (
          <div id="shop" className="sr-only" />
        )}
      </Programs>
      {homeQuestionnaire && <QuestionnaireCta view={homeQuestionnaire} locale={l} />}
      {guidesSection && site.guides.length > 0 && (
        <GuidesSection
          dict={dict}
          locale={l}
          section={guidesSection}
          guides={site.guides}
        />
      )}
      <Audience dict={dict} locale={l} />
      <Method dict={dict} locale={l} />
      <Results
        dict={dict}
        locale={l}
        videosSection={site.sections.videos}
        videos={site.videos}
        messengerUrl={contactConfig.messenger_url}
      />
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
