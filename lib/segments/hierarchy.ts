import type { Segment, SegmentGroup } from "@/lib/supabase/types";
  return segments.filter((s) => s.key !== "all");
}

export function groupsByParent(
  groups: SegmentGroup[],
): Map<string | null, SegmentGroup[]> {
  const map = new Map<string | null, SegmentGroup[]>();
  for (const group of groups) {
    const parentId = group.parent_id ?? null;
    const list = map.get(parentId) ?? [];
    list.push(group);
    map.set(parentId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "bg"));
  }
  return map;
}

export function segmentsByGroupId(segments: Segment[]): Map<string | null, Segment[]> {
  const map = new Map<string | null, Segment[]>();
  for (const segment of assignableSegments(segments)) {
    const groupId = segment.group_id ?? null;
    const list = map.get(groupId) ?? [];
    list.push(segment);
    map.set(groupId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "bg"));
  }
  return map;
}

export function flattenGroupTreeWithDepth(
  groups: SegmentGroup[],
): { group: SegmentGroup; depth: number }[] {
  const byParent = groupsByParent(groups);
  const out: { group: SegmentGroup; depth: number }[] = [];

  function walk(parentId: string | null, depth: number) {
    for (const group of byParent.get(parentId) ?? []) {
      out.push({ group, depth });
      walk(group.id, depth + 1);
    }
  }

  walk(null, 0);
  return out;
}

export function getDescendantGroupIds(
  groupId: string,
  groups: SegmentGroup[],
): string[] {
  const ids: string[] = [];
  function walk(parentId: string) {
    for (const child of groups.filter((g) => g.parent_id === parentId)) {
      ids.push(child.id);
      walk(child.id);
    }
  }
  walk(groupId);
  return ids;
}

export function getSegmentKeysForGroup(
  groupId: string,
  groups: SegmentGroup[],
  segments: Segment[],
): string[] {
  const groupIds = new Set([groupId, ...getDescendantGroupIds(groupId, groups)]);
  return assignableSegments(segments)
    .filter((segment) => segment.group_id && groupIds.has(segment.group_id))
    .map((segment) => segment.key);
}

export function getSegmentKeysForGroups(
  groupIds: string[],
  groups: SegmentGroup[],
  segments: Segment[],
): string[] {
  const out = new Set<string>();
  for (const groupId of groupIds) {
    if (!groupId) continue;
    for (const key of getSegmentKeysForGroup(groupId, groups, segments)) {
      out.add(key);
    }
  }
  return [...out];
}

/** Resolve selected segments + groups into subscriber tag keys. */
export function expandAudienceKeys(
  segmentKeys: string[],
  groupIds: string[],
  groups: SegmentGroup[],
  segments: Segment[],
): string[] {
  const out = new Set<string>();
  for (const key of segmentKeys) {
    if (key && key !== "all") out.add(key);
  }
  for (const key of getSegmentKeysForGroups(groupIds, groups, segments)) {
    out.add(key);
  }
  return [...out];
}

export function isDescendantGroup(
  groupId: string,
  ancestorId: string,
  groups: SegmentGroup[],
): boolean {
  const byId = new Map(groups.map((group) => [group.id, group]));
  let current = byId.get(groupId);
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = byId.get(current.parent_id);
  }
  return false;
}

export type GroupedSegmentRow = {
  type: "group" | "segment";
  group?: SegmentGroup;
  segment?: Segment;
  depth: number;
};

export function buildSegmentPickerRows(
  groups: SegmentGroup[],
  segments: Segment[],
): GroupedSegmentRow[] {
  const byGroup = segmentsByGroupId(segments);
  const out: GroupedSegmentRow[] = [];

  function walkGroups(parentGroupId: string | null, depth: number) {
    for (const group of groupsByParent(groups).get(parentGroupId) ?? []) {
      out.push({ type: "group", group, depth });
      for (const segment of byGroup.get(group.id) ?? []) {
        out.push({ type: "segment", segment, depth: depth + 1 });
      }
      walkGroups(group.id, depth + 1);
    }
  }

  for (const segment of byGroup.get(null) ?? []) {
    out.push({ type: "segment", segment, depth: 0 });
  }
  walkGroups(null, 0);
  return out;
}

/** @deprecated Use expandAudienceKeys with groups. */
export function expandSegmentKeys(keys: string[], segments: Segment[]): string[] {
  return expandAudienceKeys(keys, [], [], segments);
}

/** @deprecated Segment hierarchy removed — groups replace parent segments. */
export function flattenSegmentTreeWithDepth(
  segments: Segment[],
): { segment: Segment; depth: number }[] {
  return assignableSegments(segments).map((segment) => ({ segment, depth: 0 }));
}

/** @deprecated */
export function flattenSegmentTree(segments: Segment[]): Segment[] {
  return assignableSegments(segments);
}

/** @deprecated */
export function getDescendantKeys(_key: string, _segments: Segment[]): string[] {
  return [];
}
