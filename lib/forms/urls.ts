import { publicSiteOrigin } from "@/lib/site";
import type { Locale } from "@/i18n/config";

/** @deprecated Prefer `publicSiteOrigin` from `@/lib/site`. */
export function siteOrigin(): string {
  return publicSiteOrigin();
}

/** Public form page URL (no invite token). Safe for client components. */
export function publicFormUrl(slug: string, locale: Locale = "bg"): string {
  return `${publicSiteOrigin()}/${locale}/forms/${slug}`;
}
