import "server-only";

import type { SiteProgramCard } from "@/lib/supabase/types";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  isProgramLandingSlug,
  programPath,
  shortenProgramHref,
} from "@/lib/programs/types";

/**
 * The card key under the landing page's derived buttons: a checkout opened
 * from `programs_1_hero` or `programs_1_pricing_0` still belongs to the card
 * `programs_1`; the same goes for `product_<slug>_pricing_0`.
 */
function basePlacementKey(key: string): string {
  return key
    .replace(/_pricing_\d+$/, "")
    .replace(/_(hero|secondary|video|final)$/, "");
}

/** `/bg/programs/3-mes` and `/programs/3-mes` are the same programme page. */
function programHref(href: string): string {
  return shortenProgramHref(href.trim()).replace(/^\/(bg|en)(?=\/)/i, "");
}

type CardTags = Pick<SiteProgramCard, "placement_key" | "href" | "href_en" | "purchase_tags">;

/** The card a payment button belongs to, or `undefined`. */
export function findProgramCard<T extends CardTags>(
  placementKey: string,
  cards: T[],
): T | undefined {
  const base = basePlacementKey(placementKey.trim());
  if (!base) return undefined;

  const direct = cards.find((c) => c.placement_key === base);
  if (direct) return direct;

  // A programme page without a home card of its own names its buttons
  // `product_<slug>` („Кухня без резистентност“, 21 дни). The card that links
  // to that page is the same programme.
  if (!base.startsWith("product_")) return undefined;
  const slug = base.slice("product_".length);
  if (!isProgramLandingSlug(slug)) return undefined;
  const path = programPath(slug);
  return cards.find(
    (c) => programHref(c.href ?? "") === path || programHref(c.href_en ?? "") === path,
  );
}

/**
 * The groups („Групи след покупка“) of the programme card behind a paid
 * Checkout. The checkout's `placement_key` metadata names the button. Throws
 * when the cards cannot be read, so the Stripe webhook fails and is retried
 * instead of leaving the buyer outside the group.
 */
export async function programPurchaseTags(placementKey: string | null | undefined): Promise<string[]> {
  const key = placementKey?.trim() ?? "";
  if (!key) return [];

  const { data, error } = await getAdminClient()
    .from("site_program_cards")
    .select("placement_key, href, href_en, purchase_tags");
  if (error) throw new Error(`[purchase] programme cards: ${error.message}`);

  const card = findProgramCard(key, (data as CardTags[]) ?? []);
  return (card?.purchase_tags ?? []).map((tag) => tag.trim()).filter(Boolean);
}
