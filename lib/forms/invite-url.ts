import "server-only";

import { createFormInviteToken } from "@/lib/forms/form-invite-token";
import { publicFormUrl } from "@/lib/forms/urls";
import type { Locale } from "@/i18n/config";

/** Form URL with signed invite token — server only. */
export function publicFormInviteUrl(
  slug: string,
  locale: Locale,
  formId: string,
  email: string,
  subscriberId?: string | null,
): string {
  const base = publicFormUrl(slug, locale);
  const token = createFormInviteToken({
    f: formId,
    e: email,
    sid: subscriberId ?? undefined,
  });
  if (!token) return base;
  return `${base}?t=${encodeURIComponent(token)}`;
}
