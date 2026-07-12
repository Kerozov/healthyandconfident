import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import {
  expandAudienceKeys,
  getSegmentKeysForGroup,
} from "@/lib/segments/hierarchy";

export type AudienceLogic = "any" | "all";

function subscriberInExcludeList(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  const excludeSegments = automation.exclude_segment_keys?.filter(Boolean) ?? [];
  const excludeGroups = automation.exclude_group_ids?.filter(Boolean) ?? [];

  if (excludeSegments.some((key) => tags.includes(key))) return true;

  for (const groupId of excludeGroups) {
    const keys = getSegmentKeysForGroup(groupId, groups, segments);
    if (keys.some((key) => tags.includes(key))) return true;
  }

  return false;
}

export function automationMatchesPurchaseProducts(
  automation: Automation,
  purchasedProductIds: string[],
): boolean {
  const required = automation.purchase_product_ids?.filter(Boolean) ?? [];
  if (required.length === 0) return false;
  if (purchasedProductIds.length === 0) return false;
  return required.some((id) => purchasedProductIds.includes(id));
}

/** Whether a subscriber should receive this automation (include + exclude rules). */
export function subscriberMatchesAutomationAudience(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  if (subscriberInExcludeList(automation, tags, segments, groups)) {
    return false;
  }

  const segmentKeys = automation.segment_keys.filter(Boolean);
  const groupIds = automation.group_ids?.filter(Boolean) ?? [];
  if (segmentKeys.length === 0 && groupIds.length === 0) return true;

  const logic: AudienceLogic = automation.audience_logic === "all" ? "all" : "any";

  if (logic === "any") {
    return expandAudienceKeys(segmentKeys, groupIds, groups, segments).some((key) =>
      tags.includes(key),
    );
  }

  for (const key of segmentKeys) {
    if (!tags.includes(key)) return false;
  }

  for (const groupId of groupIds) {
    const keys = getSegmentKeysForGroup(groupId, groups, segments);
    if (keys.length === 0) continue;
    if (!keys.some((key) => tags.includes(key))) return false;
  }

  return segmentKeys.length > 0 || groupIds.length > 0;
}
