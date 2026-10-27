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

/** Posts are language-specific; a matching slug in another language is not a translation. */
export function localeSwitchHref(pathname: string, target: Locale): string {
  if (/^\/(bg|en)\/blog\/[^/]+\/?$/.test(pathname)) return `/${target}/blog`;
  return pathname.replace(/^\/(bg|en)(?=\/|$)/, `/${target}`) || `/${target}`;
}
