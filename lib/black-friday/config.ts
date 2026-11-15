import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteBlackFridayConfig } from "@/lib/supabase/types";
import { normalizeDisplayText } from "@/lib/site/typography";

/** Campaign settings as the public site reads them (anon key, read-only). */
export async function getBlackFridayConfig(): Promise<SiteBlackFridayConfig | null> {
  try {
    const { data } = await getPublicClient()
      .from("site_black_friday")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return normalizeDisplayText((data as SiteBlackFridayConfig | null) ?? null);
  } catch {
    return null;
  }
}

export async function getAdminBlackFridayConfig(): Promise<SiteBlackFridayConfig | null> {
  const { data } = await getAdminClient()
    .from("site_black_friday")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SiteBlackFridayConfig | null) ?? null;
}
