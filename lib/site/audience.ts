import type { SiteProduct } from "@/lib/supabase/types";

/** Offers are visible to all visitors (audience targeting removed). */
export function offerMatchesVisitor(_offer: SiteProduct): boolean {
  return true;
}
