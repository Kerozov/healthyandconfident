import "server-only";

import type { Locale } from "@/i18n/config";
import type { SiteProgramCard } from "@/lib/supabase/types";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  isProgramLandingSlug,
  programPath,
  shortenProgramHref,
} from "@/lib/programs/types";

/** A programme's group invite, resolved from the card the admin edited. */
export type ProgramGroupLink = {
  label: string;
  url: string;
};

/**
 * The card key under the landing page's derived buttons: a checkout opened
 * from `programs_1_hero` or `programs_1_pricing_0` still belongs to the card
 * `programs_1`. `product_<id>` keys have no such suffix stripping to do.
 */
function basePlacementKey(key: string): string {
  return key
    .replace(/_pricing_\d+$/, "")
    .replace(/_(hero|secondary|video|final)$/, "");
}

/**
 * The group link a payment button belongs to, or `null`.
 *
 * The button that opened Checkout is a `site_cta_placements` key, and the
 * programme's card carries the group invite. A `programs_<n>` key maps straight
 * to the card; a `product_<id>` key („Здравословно хранене…“) maps through the
 * programme page the card links to, since the two use different key families.
 */
export async function findProgramGroupLink(
  placementKey: string,
  locale: Locale,
): Promise<ProgramGroupLink | null> {
  const base = basePlacementKey(placementKey);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("site_program_cards")
    .select("placement_key, href, href_en, group_url, group_label_bg, group_label_en");
  if (error || !data) return null;

  const cards = data as SiteProgramCard[];

  let card = cards.find((c) => c.placement_key === base);
  if (!card && base.startsWith("product_")) {
    const id = base.slice("product_".length);
    if (isProgramLandingSlug(id)) {
      const path = programPath(id);
      card = cards.find(
        (c) =>
          shortenProgramHref(c.href) === path ||
          shortenProgramHref(c.href_en) === path,
      );
    }
  }

  if (!card) return null;

  const url = (card.group_url ?? "").trim();
  if (!url) return null;

  const label = (locale === "en" ? card.group_label_en : card.group_label_bg).trim();
  return { url, label };
}
