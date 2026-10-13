export const siteConfig = {
  /** Primary name for SEO and Google (how people search). */
  brand: "Vessie Nay",
  /** Program / site tagline shown under the name. */
  tagline: "Healthy & Confident",
  /** @deprecated Use brand — kept for templates that expect siteConfig.name */
  name: "Vessie Nay",
  domain: "https://www.healthyandconfident.co.uk",
  email: "vessie@healthyandconfident.co.uk",
  phone: "+44 7876 565 263",
  phoneHref: "tel:+447876565263",
  whatsapp: "https://wa.me/447876565263",
  viber: "viber://chat?number=%2B447876565263",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  /** Link to Google Business profile / write a review */
  googleReviewsUrl:
    process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ??
    "https://www.google.com/search?q=Vessie+Nay+Healthy+and+Confident+reviews",
  /** 1200×630 share card — regenerate with scripts/generate-brand-images.tsx */
  ogImage: "/og/default.jpg",
} as const;

export type SiteConfig = typeof siteConfig;

/** Canonical public site origin — `NEXT_PUBLIC_SITE_URL` or `siteConfig.domain`. */
export function publicSiteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteConfig.domain).replace(
    /\/$/,
    "",
  );
}

/**
 * Open Graph for a page that has no image of its own. Next replaces a parent's
 * `openGraph` wholesale, so a page that sets none would share the home page's
 * title and URL instead of its own.
 */
export function pageOpenGraph(
  locale: "bg" | "en",
  path: string,
  title: string,
  description?: string,
) {
  return {
    type: "website" as const,
    locale: locale === "bg" ? "bg_BG" : "en_GB",
    siteName: siteConfig.brand,
    url: `${publicSiteOrigin()}${path}`,
    title: `${title} · ${siteConfig.brand}`,
    description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
  };
}
