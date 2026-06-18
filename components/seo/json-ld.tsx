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

export function HomeJsonLd({ dict, locale }: { dict: Dictionary; locale: Locale }) {
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
        jobTitle:
          locale === "bg"
            ? "Холистичен диетолог, NHS Diabetes Practitioner"
            : "Holistic Nutritionist, NHS Diabetes Practitioner",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.domain}/#website`,
      url: siteConfig.domain,
      name: siteConfig.brand,
      alternateName: siteConfig.tagline,
      inLanguage: locale === "bg" ? "bg" : "en-GB",
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
