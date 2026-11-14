import "server-only";

import type { Locale } from "@/i18n/config";
import type { SiteProgramCard } from "@/lib/supabase/types";
import { getAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
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

  const label = ((locale === "en" ? card.group_label_en : card.group_label_bg) ?? "").trim();
  return { url, label };
}

/** The `cs_…` id Stripe puts into the success URL in place of `{CHECKOUT_SESSION_ID}`. */
const CHECKOUT_SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;

/**
 * The group invite for a finished Checkout, or `null`.
 *
 * The thank-you screen only ever gets the session id from its URL, never the
 * link itself: anyone can type a URL, so a link taken from it would let them
 * dress up any address as this site's „join the group“ button. The session is
 * read back from Stripe, and the invite is handed out only when Stripe says it
 * was paid — a bank transfer still waiting, or a made-up id, gets nothing.
 */
export async function groupLinkForCheckoutSession(
  sessionId: string,
  locale: Locale,
): Promise<ProgramGroupLink | null> {
  if (!CHECKOUT_SESSION_ID.test(sessionId)) return null;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.status !== "complete") return null;
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return null;
    }
    const key = session.metadata?.placement_key?.trim();
    if (!key) return null;
    return await findProgramGroupLink(key, locale);
  } catch {
    // Unknown id, Stripe down, or a session from another account: no button.
    return null;
  }
}
