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
import { EventsSection } from "@/components/site/sections/events";
import { ShopSection } from "@/components/site/sections/shop";
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
  const productsSection = site.sections.products;
  const offerProps = {
    placements: site.ctaPlacements,
    offersById: site.offersById,
  };

  return (
    <>
      <HomeJsonLd dict={dict} locale={l} />
      <Hero dict={dict} locale={l} {...offerProps} />
      <Marquee locale={l} />
      <Problems dict={dict} />
      <Method dict={dict} />
      <Outcomes dict={dict} />
      <Programs dict={dict} locale={l} {...offerProps} />
      {eventsSection && site.events.length > 0 && (
        <EventsSection
          dict={dict}
          locale={l}
          section={eventsSection}
          events={site.events}
          offersById={site.offersById}
        />
      )}
      {productsSection && site.products.length > 0 && (
        <ShopSection
          dict={dict}
          locale={l}
          section={productsSection}
          products={site.products}
        />
      )}
      <About dict={dict} locale={l} {...offerProps} />
      <Testimonials dict={dict} locale={l} />
      <LeadMagnet dict={dict} locale={l} />
      <Faq dict={dict} />
      <Contact dict={dict} locale={l} {...offerProps} />
    </>
  );
}
