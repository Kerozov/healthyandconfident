import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteGuide } from "@/lib/supabase/types";
import {
  expandEmailGuideMarkers,
  extractGuideIdsFromHtml,
} from "@/lib/email/guides-block";

export async function expandEmailGuides(
  html: string,
  locale: "bg" | "en",
): Promise<string> {
  const ids = extractGuideIdsFromHtml(html);
  if (ids.length === 0) return html;

  const supabase = getAdminClient();
  const { data } = await supabase.from("site_guides").select("*").in("id", ids);
  const guides = (data as SiteGuide[]) ?? [];
  const byId = new Map(guides.map((guide) => [guide.id.toLowerCase(), guide]));

  return expandEmailGuideMarkers(html, byId, locale);
}
