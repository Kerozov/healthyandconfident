import type { Locale } from "@/i18n/config";

export type MediaCategory = "vesi" | "award" | "food" | "result";

export type SiteMediaItem = {
  src: string;
  category: MediaCategory;
  alt: Record<Locale, string>;
  /** Approximate aspect for layout hints */
  aspect?: "square" | "portrait" | "landscape" | "wide";
};

/** Curated site imagery — 17 uploads in /public/images */
export const siteMedia: SiteMediaItem[] = [
  {
    src: "/images/1.jpg",
    category: "award",
    aspect: "landscape",
    alt: {
      bg: "Веси Ней получава награда за принос в областта на храненето и здравето",
      en: "Vessie Ney receiving an award for contribution in nutrition and health",
    },
  },
  {
    src: "/images/2.jpg",
    category: "award",
    aspect: "landscape",
    alt: {
      bg: "Веси Ней с приз за принос на церемония за здравословен начин на живот",
      en: "Vessie Ney with a contribution award at a wellness ceremony",
    },
  },
  {
    src: "/images/3.jpg",
    category: "vesi",
    aspect: "portrait",
    alt: {
      bg: "Веси Ней — холистичен диетолог, специалист по инсулинова резистентност и Диабет тип 2",
      en: "Vessie Ney — holistic nutritionist, insulin resistance and Type 2 Diabetes specialist",
    },
  },
  {
    src: "/images/4.jpg",
    category: "vesi",
    aspect: "portrait",
    alt: {
      bg: "Веси Ней — мотивиращ диетолог с над 20 години опит",
      en: "Vessie Ney — motivating nutritionist with 20+ years of experience",
    },
  },
  {
    src: "/images/5.jpg",
    category: "vesi",
    aspect: "portrait",
    alt: {
      bg: "Веси Ней — холистичен диетолог B.Med.Sc., NHS Diabetes Practitioner",
      en: "Vessie Ney — holistic dietitian B.Med.Sc., NHS Diabetes Practitioner",
    },
  },
  {
    src: "/images/6.jpg",
    category: "food",
    aspect: "landscape",
    alt: {
      bg: "Печена риба с зеленчуци — реално ястие от програмата за балансирано хранене",
      en: "Grilled fish with vegetables — a real meal from the balanced eating program",
    },
  },
  {
    src: "/images/7.jpg",
    category: "food",
    aspect: "landscape",
    alt: {
      bg: "Здравословни закуски с авокадо, яйца, сьомга и домати — вкусно меню без глад",
      en: "Healthy breakfasts with avocado, eggs, salmon and tomatoes — tasty menu without hunger",
    },
  },
  {
    src: "/images/8.jpg",
    category: "food",
    aspect: "landscape",
    alt: {
      bg: "Тостове с авокадо, яйца и чери домати — лесни рецепти за цялото семейство",
      en: "Avocado toast with eggs and cherry tomatoes — easy family-friendly recipes",
    },
  },
  {
    src: "/images/9.jpg",
    category: "food",
    aspect: "wide",
    alt: {
      bg: "Колаж от вкусни ястия — салати, зеленчуци, протеин и здравословни гарнитури от менюто",
      en: "Collage of delicious meals — salads, vegetables, protein and healthy sides from the menu",
    },
  },
  {
    src: "/images/10.jpg",
    category: "food",
    aspect: "landscape",
    alt: {
      bg: "Салата с грилован халуми, авокадо и домати — засищащо и вкусно хранене",
      en: "Salad with grilled halloumi, avocado and tomatoes — filling and delicious food",
    },
  },
  {
    src: "/images/11.jpg",
    category: "food",
    aspect: "wide",
    alt: {
      bg: "Малка част от реалното меню на Веси Ней — салати, супи, гарнитури и здравословни ястия",
      en: "A sample of Vessie Ney's real menu — salads, soups, sides and wholesome meals",
    },
  },
  {
    src: "/images/12.jpg",
    category: "food",
    aspect: "square",
    alt: {
      bg: "Здравословна закуска с малини, боровинки и овес — сладко без вина от захар",
      en: "Healthy breakfast with raspberries, blueberries and oats — sweet without sugar guilt",
    },
  },
  {
    src: "/images/13.jpg",
    category: "result",
    aspect: "portrait",
    alt: {
      bg: "Резултат преди и след — трайно отслабване с програмата на Веси Ней",
      en: "Before and after result — lasting weight loss with Vessie Ney's program",
    },
  },
  {
    src: "/images/14.jpg",
    category: "result",
    aspect: "portrait",
    alt: {
      bg: "Клиентка след успешна трансформация — повече увереност и енергия",
      en: "Client after a successful transformation — more confidence and energy",
    },
  },
  {
    src: "/images/15.jpg",
    category: "result",
    aspect: "portrait",
    alt: {
      bg: "Щастлива клиентка след отслабване — активен и уверен начин на живот",
      en: "Happy client after weight loss — active and confident lifestyle",
    },
  },
  {
    src: "/images/16.jpg",
    category: "result",
    aspect: "portrait",
    alt: {
      bg: "Клиентка с постигнати резултати — здравословен начин на живот на открито",
      en: "Client with achieved results — healthy lifestyle outdoors",
    },
  },
  {
    src: "/images/17.jpg",
    category: "vesi",
    aspect: "portrait",
    alt: {
      bg: "Веси Ней — вашият холистичен диетолог и ментор по пътя към здравето",
      en: "Vessie Ney — your holistic nutritionist and mentor on the path to health",
    },
  },
];

export function mediaByCategory(category: MediaCategory): SiteMediaItem[] {
  return siteMedia.filter((item) => item.category === category);
}

export function mediaSrc(category: MediaCategory, index = 0): string {
  return mediaByCategory(category)[index]?.src ?? "/images/3.jpg";
}

export function mediaAlt(src: string, locale: Locale): string {
  const item = siteMedia.find((m) => m.src === src);
  return item?.alt[locale] ?? "";
}

export function allMediaAltTexts(locale: Locale): string[] {
  return siteMedia.map((m) => m.alt[locale]);
}
