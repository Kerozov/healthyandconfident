import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/config";

/** Always the public marketing site — not localhost / preview / worker URLs. */
export function siteOrigin(): string {
  return siteConfig.domain.replace(/\/$/, "");
}

/** Public form page URL (no invite token). Safe for client components. */
export function publicFormUrl(slug: string, locale: Locale = "bg"): string {
  return `${siteOrigin()}/${locale}/forms/${slug}`;
}
