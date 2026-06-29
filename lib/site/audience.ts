import type { Segment, SiteProduct } from "@/lib/supabase/types";
import { expandSegmentKeys } from "@/lib/segments/hierarchy";

/** Empty audience_tags = visible to all visitors. */
export function offerMatchesVisitor(
  offer: SiteProduct,
  visitorTags: string[],
  segments: Segment[],
): boolean {
  const required = (offer.audience_tags ?? []).filter((t) => t && t !== "all");
  if (required.length === 0) return true;
  if (visitorTags.length === 0) return false;

  const expanded = new Set(expandSegmentKeys(required, segments));
  return visitorTags.some((tag) => expanded.has(tag));
}
