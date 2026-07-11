import { siteConfig } from "@/lib/site";
import { createFormInviteToken } from "@/lib/forms/form-invite-token";
import type { Locale } from "@/i18n/config";

/** Always the public marketing site — not localhost / preview / worker URLs. */
export function siteOrigin(): string {
  return siteConfig.domain.replace(/\/$/, "");
}

export function publicFormUrl(
  slug: string,
  locale: Locale,
  formId?: string,
  email?: string,
  subscriberId?: string | null,
): string {
  const base = `${siteOrigin()}/${locale}/forms/${slug}`;
  if (!email || !formId) return base;
  const token = createFormInviteToken({
    f: formId,
    e: email,
    sid: subscriberId ?? undefined,
  });
  if (!token) return base;
  return `${base}?t=${encodeURIComponent(token)}`;
}
