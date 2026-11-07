import "server-only";

import { getPublicClient } from "@/lib/supabase/public";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteQuestionnaireCta } from "@/lib/supabase/types";

/**
 * The public site reads with the anon key. A missing table (migration 090 not
 * applied) or missing env simply means "no questionnaire block".
 */
export async function getSiteQuestionnaireCta(): Promise<SiteQuestionnaireCta | null> {
  try {
    const { data, error } = await getPublicClient()
      .from("site_questionnaire_cta")
      .select("*")
      .eq("id", "home")
      .maybeSingle();
    if (error) return null;
    return (data as SiteQuestionnaireCta | null) ?? null;
  } catch {
    return null;
  }
}

export async function getAdminQuestionnaireCta(): Promise<{
  row: SiteQuestionnaireCta | null;
  available: boolean;
}> {
  const { data, error } = await getAdminClient()
    .from("site_questionnaire_cta")
    .select("*")
    .eq("id", "home")
    .maybeSingle();
  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /site_questionnaire_cta|schema cache/i.test(error.message ?? "");
    if (!missing) console.error("[questionnaire-cta] read:", error.message);
    return { row: null, available: !missing };
  }
  return { row: (data as SiteQuestionnaireCta | null) ?? null, available: true };
}
