import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getPublicSiteContent } from "@/lib/site/content";
import { Hero } from "@/components/site/sections/hero";
import { TrustFeatures } from "@/components/site/sections/trust-features";
import { About } from "@/components/site/sections/about";
import { FoodShowcase } from "@/components/site/sections/food-showcase";
import { Problems } from "@/components/site/sections/problems";
import { Method } from "@/components/site/sections/method";
import { Programs } from "@/components/site/sections/programs";
import { TransformationResults } from "@/components/site/sections/transformation-results";
import { Outcomes } from "@/components/site/sections/outcomes";
import { Testimonials } from "@/components/site/sections/testimonials";
import { GoogleReviews } from "@/components/site/sections/google-reviews";
import { Challenge21Section } from "@/components/site/sections/challenge-21";
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

  return (
    <>
      <HomeJsonLd dict={dict} locale={l} />
      <Hero dict={dict} locale={l} />
      <TrustFeatures locale={l} />
      <About dict={dict} locale={l} />
      <FoodShowcase dict={dict} locale={l} />
      <Problems dict={dict} />
      <Method dict={dict} locale={l} />
      <Programs dict={dict} locale={l} />
      <TransformationResults dict={dict} locale={l} />
      <Outcomes dict={dict} locale={l} />
      <Testimonials dict={dict} locale={l} />
      <GoogleReviews dict={dict} />
      <Challenge21Section dict={dict} locale={l} />
      {eventsSection && site.events.length > 0 && (
        <EventsSection
          dict={dict}
          locale={l}
          section={eventsSection}
          events={site.events}
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
      <LeadMagnet dict={dict} locale={l} />
      <Faq dict={dict} />
      <Contact dict={dict} />
    </>
  );
}
