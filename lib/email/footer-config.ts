import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { EmailFooterConfig, Locale } from "@/lib/supabase/types";
import { footerConfigFromRow } from "@/lib/email/footer-defaults";

export { DEFAULT_EMAIL_FOOTER, footerConfigFromRow } from "@/lib/email/footer-defaults";

const cache = new Map<Locale, { at: number; config: EmailFooterConfig }>();
const CACHE_MS = 60_000;

export async function getEmailFooterConfig(locale: Locale): Promise<EmailFooterConfig> {
  const hit = cache.get(locale);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.config;
  }

  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from("email_footer_config")
      .select("*")
      .eq("locale", locale)
      .maybeSingle();
    const config = footerConfigFromRow((data as EmailFooterConfig | null) ?? null, locale);
    cache.set(locale, { at: Date.now(), config });
    return config;
  } catch {
    return footerConfigFromRow(null, locale);
  }
}

export function invalidateEmailFooterCache(locale?: Locale): void {
  if (locale) cache.delete(locale);
  else cache.clear();
}
