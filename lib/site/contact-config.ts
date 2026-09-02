import "server-only";

import { cache } from "react";
import { getAdminClient } from "@/lib/supabase/admin";
import { getPublicClient } from "@/lib/supabase/public";
import type { SiteContactConfig } from "@/lib/supabase/types";
import { siteConfig } from "@/lib/site";

export const DEFAULT_SITE_CONTACT: SiteContactConfig = {
  id: "00000000-0000-0000-0000-000000000000",
  messenger_url: "https://m.me/healthyandconfident",
  messenger_enabled: true,
  email: siteConfig.email,
  phone: siteConfig.phone,
  phone_href: siteConfig.phoneHref,
  whatsapp_url: siteConfig.whatsapp,
  updated_at: new Date(0).toISOString(),
};

function fromRow(row: SiteContactConfig | null): SiteContactConfig {
  if (!row) return DEFAULT_SITE_CONTACT;
  return {
    ...DEFAULT_SITE_CONTACT,
    ...row,
    messenger_url: row.messenger_url.trim() || DEFAULT_SITE_CONTACT.messenger_url,
    email: row.email.trim() || DEFAULT_SITE_CONTACT.email,
    phone: row.phone.trim() || DEFAULT_SITE_CONTACT.phone,
    phone_href: row.phone_href.trim() || DEFAULT_SITE_CONTACT.phone_href,
    whatsapp_url: row.whatsapp_url.trim() || DEFAULT_SITE_CONTACT.whatsapp_url,
  };
}

async function fetchContactConfig(
  client: ReturnType<typeof getPublicClient> | ReturnType<typeof getAdminClient>,
): Promise<SiteContactConfig> {
  try {
    const { data } = await client
      .from("site_contact_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return fromRow((data as SiteContactConfig | null) ?? null);
  } catch {
    return DEFAULT_SITE_CONTACT;
  }
}

export const getSiteContactConfig = cache(async (): Promise<SiteContactConfig> => {
  try {
    return await fetchContactConfig(getPublicClient());
  } catch {
    return DEFAULT_SITE_CONTACT;
  }
});

export async function getAdminSiteContactConfig(): Promise<SiteContactConfig> {
  return fetchContactConfig(getAdminClient());
}

export function invalidateSiteContactCache(): void {
  // React cache() is per-request; admin saves rely on revalidatePath.
}
