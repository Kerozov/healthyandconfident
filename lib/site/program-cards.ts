import type { Locale } from "@/i18n/config";
import type { Program } from "@/i18n/types";
import type { SiteProgramCard } from "@/lib/supabase/types";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import {
  PROGRAM_LANDING_SLUGS,
  programPath,
  shortenProgramHref,
} from "@/lib/programs/types";

/** Hidden per language, exactly like shop products and guides. */
export function programCardVisibleInLocale(
  card: SiteProgramCard,
  locale: Locale,
): boolean {
  return visibleInLocale(card.enabled, card.enabled_en, locale);
}

export function filterProgramCardsForLocale(
  cards: SiteProgramCard[],
  locale: Locale,
): SiteProgramCard[] {
  return cards.filter((card) => programCardVisibleInLocale(card, locale));
}

export function isExternalProgramHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href.trim());
}

/**
 * The href the card's button actually points at.
 *
 * Our own paths are written without a language („/programs/x“, „#contact“) so
 * one card serves both sites; a path that already names a language and an
 * external link are both left alone.
 */
export function programCardHref(href: string, locale: Locale): string {
  // Cards saved before the programmes got short addresses still name the
  // long ones — sent straight to the short page, no redirect on the way.
  const value = shortenProgramHref(href.trim());
  if (!value) return `/${locale}#contact`;
  if (isExternalProgramHref(value)) return value;
  if (value.startsWith("#")) return `/${locale}${value}`;
  if (/^\/(bg|en)(\/|#|$)/.test(value)) return value;
  if (value.startsWith("/")) return `/${locale}${value}`;
  return value;
}

function pick(bg: string, en: string, locale: Locale): string {
  return locale === "en" ? en.trim() || bg : bg;
}

/** A database card rendered as the shape the Programs section draws. */
export function programCardForLocale(
  card: SiteProgramCard,
  locale: Locale,
): Program {
  const features = locale === "en" ? card.features_en : card.features_bg;
  return {
    badge: pick(card.badge_bg, card.badge_en, locale) || undefined,
    title: pick(card.title_bg, card.title_en, locale),
    duration: pick(card.duration_bg, card.duration_en, locale),
    price: pick(card.price_bg, card.price_en, locale),
    description: pick(card.description_bg, card.description_en, locale),
    features:
      (features.length > 0 ? features : card.features_bg).filter(Boolean),
    cta: pick(card.cta_label_bg, card.cta_label_en, locale),
    href: pick(card.href, card.href_en, locale),
    highlight: card.highlight,
    image: card.image_url ?? undefined,
  };
}

/** What a card's button is called in the admin's button list. */
export function programCardPlacementLabel(title_bg: string, title_en: string) {
  return {
    label_bg: `Програми: „${title_bg}“ — бутон на картичката`,
    label_en: `Programs: “${title_en || title_bg}” — card button`,
  };
}

/** The next free `programs_<n>` key, so a new card never steals an old one. */
export function nextProgramPlacementKey(existingKeys: string[]): string {
  let max = -1;
  for (const key of existingKeys) {
    const match = /^programs_(\d+)$/.exec(key);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `programs_${max + 1}`;
}

export type ProgramLinkOption = { value: string; label: string };

/**
 * Our own pages, offered as a list so the admin picks instead of typing a path
 * that only looks right.
 */
export const PROGRAM_LINK_OPTIONS: ProgramLinkOption[] = [
  ...PROGRAM_LANDING_SLUGS.map((slug) => ({
    value: programPath(slug),
    label: `Страница на програмата: ${programPath(slug)}`,
  })),
  { value: "/programs", label: "Всички програми: /programs" },
  { value: "/blog", label: "Блог: /blog" },
  { value: "#contact", label: "Секция „Контакти“ на началната страница" },
  { value: "#programs", label: "Секция „Програми“ на началната страница" },
  { value: "#shop", label: "Секция „Магазин“ на началната страница" },
  { value: "#results", label: "Секция „Резултати“ на началната страница" },
];
