import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { siteConfig, publicSiteOrigin } from "@/lib/site";
import { siteMedia } from "@/lib/site/media-gallery";

export function JsonLd({ data }: { data: object }) {
  // `<` is escaped so a string containing `</script>` cannot end the tag early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

function bgPersonSchema(origin: string) {
  return {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Веси Ней",
  alternateName: "Vessie Nay",
  jobTitle: "Холистичен диетолог",
  description:
    "Холистичен диетолог, специалист по инсулинова резистентност и Диабет тип 2. NHS Diabetes Practitioner в Англия с 20+ години опит.",
  url: `${origin}/bg`,
  image: `${origin}/images/3.jpg`,
  telephone: "+447876565263",
  email: "vessie@healthyandconfident.co.uk",
  sameAs: [
    "https://www.facebook.com/healthyandconfident",
    "https://www.instagram.com/healthyandconfident",
  ],
  knowsAbout: [
    "Инсулинова резистентност",
    "Диабет тип 2",
    "Трайно отслабване",
    "Холистично хранене",
    "Менопауза и хранене",
  ],
  areaServed: ["България", "Великобритания", "Онлайн"],
};
}

/** Built from the questions on the page — Google wants the two to match. */
function faqSchema(dict: Dictionary) {
  return {
    "@type": "FAQPage",
    mainEntity: dict.faq.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

function bgProfessionalServiceSchema(origin: string) {
  return {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Веси Ней — Healthy & Confident",
  description:
    "Холистичен диетолог — инсулинова резистентност, Диабет тип 2 и трайно отслабване",
  url: `${origin}/bg`,
  telephone: "+447876565263",
  email: "vessie@healthyandconfident.co.uk",
  areaServed: ["BG", "GB"],
  serviceType: [
    "Диетология",
    "Холистично хранене",
    "Инсулинова резистентност",
    "Диабет тип 2",
  ],
  priceRange: "€€",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "3",
  },
};
}

export function HomeJsonLd({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const origin = publicSiteOrigin();
  const pageUrl = `${origin}/${locale}`;
  const imageGallery = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name:
      locale === "bg"
        ? "Реално меню и резултати — Веси Ней"
        : "Real meals and results — Vessie Nay",
    description: dict.method.foodNote,
    url: `${pageUrl}#food`,
    image: siteMedia.map((item) => ({
      "@type": "ImageObject",
      contentUrl: `${origin}${item.src}`,
      description: item.alt[locale],
    })),
  };

  if (locale === "bg") {
    return (
      <>
        <JsonLd data={bgPersonSchema(origin)} />
        <JsonLd data={{ "@context": "https://schema.org", ...faqSchema(dict) }} />
        <JsonLd data={bgProfessionalServiceSchema(origin)} />
        <JsonLd data={imageGallery} />
      </>
    );
  }

  const url = pageUrl;

  const graph = [
    {
      "@type": "ProfessionalService",
      "@id": `${origin}/#business`,
      name: siteConfig.brand,
      alternateName: siteConfig.tagline,
      description: dict.meta.description,
      url,
      email: siteConfig.email,
      telephone: siteConfig.phone,
      image: `${origin}${siteConfig.ogImage}`,
      priceRange: "££",
      areaServed: ["GB", "BG"],
      founder: {
        "@type": "Person",
        name: siteConfig.brand,
        jobTitle: "Holistic Nutritionist, NHS Diabetes Practitioner",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: origin,
      name: siteConfig.brand,
      alternateName: siteConfig.tagline,
      inLanguage: "en-GB",
    },
    { ...faqSchema(dict), "@id": `${url}#faq` },
  ];

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />
      <JsonLd data={imageGallery} />
    </>
  );
}
