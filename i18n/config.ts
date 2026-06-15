export const locales = ["bg", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "bg";

export const localeNames: Record<Locale, string> = {
  bg: "БГ",
  en: "EN",
};

export const localeHtmlLang: Record<Locale, string> = {
  bg: "bg",
  en: "en-GB",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
