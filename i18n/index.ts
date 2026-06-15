import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { bg } from "@/i18n/dictionaries/bg";
import { en } from "@/i18n/dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { bg, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.bg;
}
