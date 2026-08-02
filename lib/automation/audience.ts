import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { signupSourceMatches } from "@/lib/automation/signup-sources";
import { subscriberOriginMatches } from "@/lib/automation/subscriber-origins";
import { purchasedProductIdsFromTags } from "@/lib/purchase/product-tags";
import {
  expandAudienceKeys,
  getSegmentKeysForGroup,
} from "@/lib/segments/hierarchy";

export type AudienceLogic = "any" | "all";

export type AudienceContext = {
  /** Products the subscriber already paid for (history + the current purchase). */
  purchasedProductIds?: string[];
};

/** Products this subscriber owns — from the run context and from `product:<id>` tags. */
function ownedProductIds(tags: string[], ctx?: AudienceContext): Set<string> {
  return new Set([
    ...(ctx?.purchasedProductIds ?? []),
    ...purchasedProductIdsFromTags(tags),
  ]);
}

/** Buyers of an excluded product never enter (or stay in) the automation. */
export function automationExcludesBuyer(
  automation: Automation,
  tags: string[],
  ctx?: AudienceContext,
): boolean {
  const excluded =
    automation.exclude_purchase_product_ids?.filter(Boolean) ?? [];
  if (excluded.length === 0) return false;

  const owned = ownedProductIds(tags, ctx);
  return excluded.some((id) => owned.has(id));
}

function subscriberInExcludeList(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
  ctx?: AudienceContext,
): boolean {
  if (automationExcludesBuyer(automation, tags, ctx)) return true;

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

export function automationMatchesSignupSource(
  automation: Automation,
  source?: string | null,
): boolean {
  return signupSourceMatches(automation.signup_sources ?? [], source);
}

export function automationMatchesSubscriberOrigin(
  automation: Automation,
  ctx: { isNew: boolean; source?: string | null },
): boolean {
  return subscriberOriginMatches(
    automation.subscriber_origins ?? [],
    { isNew: ctx.isNew, source: ctx.source ?? undefined },
    automation.new_subscribers_only,
  );
}

/** Whether a subscriber should receive this automation (include + exclude rules). */
export function subscriberMatchesAutomationAudience(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
  ctx?: AudienceContext,
): boolean {
  if (subscriberInExcludeList(automation, tags, segments, groups, ctx)) {
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
