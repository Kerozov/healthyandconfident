import "server-only";

import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement } from "@/lib/supabase/types";
import type { ProgramLandingContent } from "@/lib/programs/types";
import { getProgramLanding } from "@/lib/programs/landings";
import { fillProgramPrices, programPricingPriceIds } from "@/lib/programs/prices";
import { getLivePrices } from "@/lib/stripe/live-prices";

/** A programme page quoting the Stripe prices its price-card buttons charge. */
export async function getPricedProgramLanding(
  locale: Locale,
  slug: string,
  placements: Record<string, SiteCtaPlacement>,
): Promise<ProgramLandingContent | null> {
  const content = getProgramLanding(locale, slug);
  if (!content) return null;
  const priceIds = programPricingPriceIds(content, placements, locale);
  const live = await getLivePrices(priceIds);
  return fillProgramPrices(
    content,
    priceIds.map((id) => live[id]),
    locale,
  );
}
