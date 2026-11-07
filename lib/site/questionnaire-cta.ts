import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import type { SiteQuestionnaireCta } from "@/lib/supabase/types";

/**
 * The entry questionnaire as the site shows it. Client-safe: no database here,
 * the row is read by `questionnaire-cta-data.ts`.
 */

export const QUESTIONNAIRE_CTA_DEFAULTS: SiteQuestionnaireCta = {
  id: "home",
  form_slug: "",
  show_in_nav: false,
  show_on_home: false,
  show_en: false,
  nav_label_bg: "Въпросник",
  nav_label_en: "Questionnaire",
  eyebrow_bg: "Първата стъпка",
  eyebrow_en: "The first step",
  title_bg: "Ако не знаеш откъде да започнеш",
  title_en: "If you don't know where to start",
  text_bg:
    "Първата и най-важна стъпка е да попълниш въпросника - и аз ще ти дам конкретна насока за най-бързи резултати.",
  text_en:
    "The first and most important step is to fill in the questionnaire - and I will give you clear direction for the fastest results.",
  button_bg: "Попълни въпросника",
  button_en: "Take the questionnaire",
  image_url: null,
  updated_at: "",
};

export const QUESTIONNAIRE_CTA_IMAGE = "/images/4.jpg";

export type QuestionnaireCtaView = {
  href: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  text: string;
  button: string;
  imageUrl: string;
  showInNav: boolean;
  showOnHome: boolean;
};

function pick(bg: string, en: string, fallbackBg: string, fallbackEn: string, locale: Locale) {
  if (locale === "en") return en.trim() || fallbackEn;
  return bg.trim() || fallbackBg;
}

/** What one locale shows, or `null` when the questionnaire is off there. */
export function questionnaireCtaForLocale(
  row: SiteQuestionnaireCta | null,
  locale: Locale,
): QuestionnaireCtaView | null {
  if (!row || !row.form_slug.trim()) return null;
  if (!row.show_in_nav && !row.show_on_home) return null;
  if (locale === "en" && !row.show_en) return null;
  const d = QUESTIONNAIRE_CTA_DEFAULTS;
  return {
    href: `/${locale}/forms/${encodeURIComponent(row.form_slug.trim())}`,
    navLabel: pick(row.nav_label_bg, row.nav_label_en, d.nav_label_bg, d.nav_label_en, locale),
    eyebrow: pick(row.eyebrow_bg, row.eyebrow_en, d.eyebrow_bg, d.eyebrow_en, locale),
    title: pick(row.title_bg, row.title_en, d.title_bg, d.title_en, locale),
    text: pick(row.text_bg, row.text_en, d.text_bg, d.text_en, locale),
    button: pick(row.button_bg, row.button_en, d.button_bg, d.button_en, locale),
    imageUrl: row.image_url?.trim() || QUESTIONNAIRE_CTA_IMAGE,
    showInNav: row.show_in_nav,
    showOnHome: row.show_on_home,
  };
}

/** The header menu with the questionnaire right after „Програми“. */
export function navItemsWithQuestionnaire(
  items: NavItem[],
  view: QuestionnaireCtaView | null,
): NavItem[] {
  if (!view?.showInNav) return items;
  const entry: NavItem = { label: view.navLabel, href: view.href, highlight: true };
  const at = items.findIndex((item) => item.href === "#programs");
  if (at === -1) return [entry, ...items];
  return [...items.slice(0, at + 1), entry, ...items.slice(at + 1)];
}
