import "server-only";

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type { Locale } from "@/i18n/config";

/**
 * Segment tag admins pick in /admin/popup ("Save to segment"). Reads directly
 * so the tag applies on every entry point into the gift-menu popup (auto-delay,
 * nav link, header CTA) — not just the client fetch that gates the auto-popup.
 */
export const getPopupSegmentTag = cache(async (locale: Locale): Promise<string> => {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("popup_config")
      .select("segment_tag")
      .eq("locale", locale)
      .maybeSingle();
    return (data as { segment_tag: string } | null)?.segment_tag?.trim() || "all";
  } catch {
    return "all";
  }
});
