import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent } from "@/lib/site/content";
import { Hero } from "@/components/site/sections/hero";
import { Marquee } from "@/components/site/sections/marquee";
import { Problems } from "@/components/site/sections/problems";
import { Method } from "@/components/site/sections/method";
import { Outcomes } from "@/components/site/sections/outcomes";
import { Programs } from "@/components/site/sections/programs";
import { About } from "@/components/site/sections/about";
import { Testimonials } from "@/components/site/sections/testimonials";
import { GoogleReviews } from "@/components/site/sections/google-reviews";
import { EventsSection } from "@/components/site/sections/events";
import { LeadMagnet } from "@/components/site/sections/leadmagnet";
import { Faq } from "@/components/site/sections/faq";
import { Contact } from "@/components/site/sections/contact";
import { HomeJsonLd } from "@/components/seo/json-ld";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l = locale as Locale;
  const [dict, site] = await Promise.all([getDictionary(l), getPublicSiteContent()]);
  const eventsSection = site.sections.events;

  return (
    <>
      <HomeJsonLd dict={dict} locale={l} />
      <Hero dict={dict} locale={l} />
      <Marquee locale={l} />
      <Problems dict={dict} />
      <Method dict={dict} />
      <Outcomes dict={dict} locale={l} />
      <Programs dict={dict} locale={l} products={site.products} />
      {eventsSection && site.events.length > 0 && (
        <EventsSection
          dict={dict}
          locale={l}
          section={eventsSection}
          events={site.events}
        />
      )}
      <About dict={dict} locale={l} />
      <Testimonials dict={dict} locale={l} />
      <GoogleReviews dict={dict} />
      <LeadMagnet dict={dict} locale={l} />
      <Faq dict={dict} />
      <Contact dict={dict} />
    </>
  );
}
