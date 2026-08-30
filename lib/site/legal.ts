import type { Locale } from "@/i18n/config";
import type { Dictionary, LegalPageCopy } from "@/i18n/types";

export const LEGAL_SLUGS = ["privacy", "terms", "support"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export function legalPath(locale: Locale, slug: LegalSlug): string {
  return `/${locale}/${slug}`;
}

export function legalCopy(dict: Dictionary, slug: LegalSlug): LegalPageCopy {
  return dict.legal[slug];
}
