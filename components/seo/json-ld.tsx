import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { siteConfig } from "@/lib/site";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const bgPersonSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Веси Ней",
  alternateName: "Vessie Ney",
  jobTitle: "Холистичен диетолог",
  description:
    "Холистичен диетолог, специалист по инсулинова резистентност и Диабет тип 2. NHS Diabetes Practitioner в Англия с 20+ години опит.",
  url: "https://www.healthyandconfident.co.uk/bg",
  image: "https://www.healthyandconfident.co.uk/og/default.jpg",
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

const bgFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Това поредната диета ли е?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Не. Не залагаме на ограничения и глад. Добавяме правилната храна, структура, мотивация и подкрепа, за да са трайни резултатите за цял живот.",
      },
    },
    {
      "@type": "Question",
      name: "Наистина ли помага при Диабет тип 2?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Да — методът е изграден около трайно балансиране на кръвната захар, с 94% успех, базиран на опита на Веси Ней като NHS Diabetes Practitioner със стотици пациенти.",
      },
    },
    {
      "@type": "Question",
      name: "Как протичат срещите с Веси Ней?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Индивидуално и в малки групи онлайн през Zoom, от комфорта на дома ти.",
      },
    },
    {
      "@type": "Question",
      name: "Трябва ли да прекарвам часове в кухнята?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Не. Рецептите са лесни, бързи и засищащи, харесват се от цялото семейство и не изискват пазаруване в специализирани магазини.",
      },
    },
  ],
};

const bgProfessionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Веси Ней — Healthy & Confident",
  description:
    "Холистичен диетолог — инсулинова резистентност, Диабет тип 2 и трайно отслабване",
  url: "https://www.healthyandconfident.co.uk/bg",
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

export function HomeJsonLd({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  if (locale === "bg") {
    return (
      <>
        <JsonLd data={bgPersonSchema} />
        <JsonLd data={bgFaqSchema} />
        <JsonLd data={bgProfessionalServiceSchema} />
      </>
    );
  }

  const url = `${siteConfig.domain}/${locale}`;

  const graph = [
    {
      "@type": "ProfessionalService",
      "@id": `${siteConfig.domain}/#business`,
      name: siteConfig.brand,
      alternateName: siteConfig.tagline,
      description: dict.meta.description,
      url,
      email: siteConfig.email,
      telephone: siteConfig.phone,
      image: `${siteConfig.domain}${siteConfig.ogImage}`,
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
      "@id": `${siteConfig.domain}/#website`,
      url: siteConfig.domain,
      name: siteConfig.brand,
      alternateName: siteConfig.tagline,
      inLanguage: "en-GB",
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: dict.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
