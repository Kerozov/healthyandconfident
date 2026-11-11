import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type {
  SiteBundle,
  SiteBlackFridayConfig,
} from "@/lib/supabase/types";
import { normalizeDisplayText } from "@/lib/site/typography";

async function withPublicClient<T>(
  run: (client: ReturnType<typeof getPublicClient>) => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return normalizeDisplayText(await run(getPublicClient()));
  } catch {
    return fallback;
  }
}

/** Bundles shown on `/black-friday`, in admin sort order. */
export async function getSiteBundles(includeDisabled = false): Promise<SiteBundle[]> {
  return withPublicClient(async (supabase) => {
    let q = supabase
      .from("site_bundles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeDisabled) q = q.or("enabled.eq.true,enabled_en.eq.true");
    const { data } = await q;
    return (data as SiteBundle[]) ?? [];
  }, []);
}

export async function getAdminSiteBundles(): Promise<SiteBundle[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_bundles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as SiteBundle[]) ?? [];
}

export async function getBlackFridayConfig(): Promise<SiteBlackFridayConfig | null> {
  return withPublicClient(async (supabase) => {
    const { data } = await supabase
      .from("site_black_friday")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as SiteBlackFridayConfig) ?? null;
  }, null);
}

export async function getAdminBlackFridayConfig(): Promise<SiteBlackFridayConfig | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("site_black_friday")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SiteBlackFridayConfig) ?? null;
}
