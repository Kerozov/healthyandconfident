import type { Locale } from "@/i18n/config";

/** Segment for people on the English site (/en) or English-speaking imports. */
export const EN_RECIPIENT_TAG = "en";

const BG_LOCATION_MARKERS = [
  "bulgaria",
  "българия",
  "софия",
  "sofia",
  "пловдив",
  "plovdiv",
  "варна",
  "varna",
  "бургас",
  "burgas",
];

const EN_LOCATION_MARKERS = [
  "united states",
  "united kingdom",
  "great britain",
  "england",
  "scotland",
  "wales",
  "northern ireland",
  "ireland",
  "canada",
  "australia",
  "new zealand",
  "usa",
  "u.s.a",
  "u.s.",
  " uk",
  " uk,",
  "(uk)",
];

export function inferLocaleFromLocation(value: string | undefined): Locale | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if (BG_LOCATION_MARKERS.some((marker) => v.includes(marker))) return "bg";
  if (EN_LOCATION_MARKERS.some((marker) => v.includes(marker))) return "en";
  return undefined;
}

export function isEnglishRecipient(row: {
  locale?: string | null;
  tags?: string[] | null;
}): boolean {
  if (row.locale === "en") return true;
  return (row.tags ?? []).some(
    (tag) => tag.trim().toLowerCase() === EN_RECIPIENT_TAG,
  );
}

export function localeFromSubscriber(
  row: { locale?: string | null; tags?: string[] | null } | null | undefined,
): Locale {
  if (!row) return "bg";
  return isEnglishRecipient(row) ? "en" : "bg";
}

/** Add or remove the `en` tag without touching other segments. */
export function applyEnglishRecipientTag(
  tags: string[] | null | undefined,
  locale: Locale,
): string[] {
  const next = new Set<string>();
  for (const tag of tags ?? []) {
    const normalized = tag.trim().toLowerCase();
    if (normalized && normalized !== EN_RECIPIENT_TAG) next.add(normalized);
  }
  if (locale === "en") next.add(EN_RECIPIENT_TAG);
  return [...next];
}
