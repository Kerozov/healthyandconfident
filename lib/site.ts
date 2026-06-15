export const siteConfig = {
  name: "Healthy & Confident",
  brand: "Vessie Ney",
  domain: "https://www.healthyandconfident.co.uk",
  email: "vessie@healthyandconfident.co.uk",
  phone: "+44 7876 565 263",
  phoneHref: "tel:+447876565263",
  whatsapp: "https://wa.me/447876565263",
  viber: "viber://chat?number=%2B447876565263",
  facebook: "https://www.facebook.com/",
  instagram: "https://www.instagram.com/",
  // Default OG image (place a real asset in /public/og)
  ogImage: "/og/default.jpg",
} as const;

export type SiteConfig = typeof siteConfig;
