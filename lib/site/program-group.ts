import "server-only";

import type { Locale } from "@/i18n/config";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SiteProgramCard } from "@/lib/supabase/types";
import {
  isProgramLandingSlug,
  resolveProgramSlug,
} from "@/lib/programs/types";

/**
 * The „Влез в групата“ link for the programme a checkout button sells.
 *
 * A programme is bought through a `site_cta_placements` button whose key is
 * either `product_<slug>` (a landing-only programme such as the cooking one)
 * or `programs_<n>` / one of its suffixes (`_hero`, `_pricing_0`, …) for a
 * programme that has a card. Both end up in `site_program_cards`: the card is
 * where the admin keeps the group link, so this resolves the button to its
 * card and reads that link. `null` when the button is not a programme button
 * or the card has no group link for this locale.
 */
export async function programGroupLinkForPlacementKey(
  placementKey: string,
  locale: Locale,
): Promise<{ label: string; href: string } | null> {
  const base = basePlacementKey(placementKey.trim());
  if (!base) return null;

  const isProduct = base.startsWith("product_");
  const isCard = /^programs_\d+$/.test(base);
  if (!isProduct && !isCard) return null;

  const productSlug = isProduct ? base.slice("product_".length) : null;
  if (isProduct && !isProgramLandingSlug(productSlug!)) return null;

  const { data } = await getAdminClient().from("site_program_cards").select("*");
  const cards = (data ?? []) as SiteProgramCard[];

  const slug = isCard
    ? (() => {
        const card = cards.find((c) => c.placement_key === base);
        return card ? resolveProgramSlug(hrefSegment(card.href)) : null;
      })()
    : productSlug;
  if (!slug) return null;

  const card = cards.find(
    (c) => resolveProgramSlug(hrefSegment(c.href)) === slug,
  );
  if (!card) return null;

  const label = (
    locale === "bg"
      ? card.group_label_bg
      : card.group_label_en || card.group_label_bg
  ).trim();
  const href = (
    locale === "en"
      ? card.group_url_en || card.group_url
      : card.group_url
  ).trim();

  return label && href ? { label, href } : null;
}

/** `programs_1_pricing_0` → `programs_1`, `product_x` stays as it is. */
function basePlacementKey(key: string): string {
  return key
    .replace(/_pricing_\d+$/, "")
    .replace(/_(hero|secondary|video|final)$/, "");
}

function hrefSegment(href: string): string {
  const match = href.match(/\/programs\/([^/?#]+)/i);
  return match ? match[1] : "";
}
