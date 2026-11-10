import type { Locale } from "@/i18n/config";

export type SampleRecipe = {
  src: string;
  alt: Record<Locale, string>;
  width: number;
  height: number;
};

export const sampleRecipes: readonly SampleRecipe[] = [
  {
    src: "/images/recipe-turkey-muffins.jpg",
    alt: {
      bg: "Пуешки мъфини с яйца и сирене",
      en: "Turkey muffins with eggs and cheese",
    },
    width: 1545,
    height: 2000,
  },
  {
    src: "/images/recipe-everyday-salad.jpg",
    alt: {
      bg: "Лесна салата за всеки ден",
      en: "Easy everyday salad",
    },
    width: 1545,
    height: 1999,
  },
];
