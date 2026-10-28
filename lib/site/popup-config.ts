import "server-only";

import { cache } from "react";
import { getPublicClient } from "@/lib/supabase/public";
import type { Locale } from "@/i18n/config";
import type { PopupConfig } from "@/lib/supabase/types";

/**
 * Thank-you settings from /admin/popup, shared by signup and checkout screens.
 * Selecting the row also tolerates deployments before the optional button
 * column exists, so existing signup forms continue to work during the upgrade.
 */
export const getPopupThankYouConfig = cache(async (locale: Locale): Promise<
  Pick<PopupConfig, "segment_tag" | "success_message" | "success_button" | "checkout_button"> | null
> => {
  try {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from("popup_config")
      .select("*")
      .eq("locale", locale)
      .maybeSingle();
    return data as Pick<PopupConfig, "segment_tag" | "success_message" | "success_button" | "checkout_button"> | null;
  } catch {
    return null;
  }
});
