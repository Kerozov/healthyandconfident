import "server-only";

import { publicFormUrl } from "@/lib/forms/urls";
import type { Locale } from "@/i18n/config";

/** Form URL with an already-created invite token — server only. */
export function publicFormInviteUrl(
  slug: string,
  locale: Locale,
  token?: string | null,
): string {
  const base = publicFormUrl(slug, locale);
  if (!token?.trim()) return base;
  return `${base}?t=${encodeURIComponent(token)}`;
}
