import type { Segment } from "@/lib/supabase/types";

export function segmentsByParent(segments: Segment[]): Map<string | null, Segment[]> {
  const map = new Map<string | null, Segment[]>();
  for (const s of segments) {
    const pid = s.parent_id ?? null;
    const list = map.get(pid) ?? [];
    list.push(s);
    map.set(pid, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "bg"));
  }
  return map;
}

export function getDescendantKeys(key: string, segments: Segment[]): string[] {
  const byKey = new Map(segments.map((s) => [s.key, s]));
  const root = byKey.get(key);
  if (!root) return [];

  const keys: string[] = [];
  function walk(parentId: string) {
    for (const child of segments.filter((s) => s.parent_id === parentId)) {
      keys.push(child.key);
      walk(child.id);
    }
  }
  walk(root.id);
  return keys;
}

/** Parent selection includes all nested subgroup keys. */
export function expandSegmentKeys(keys: string[], segments: Segment[]): string[] {
  const out = new Set<string>();
  for (const key of keys) {
    if (!key || key === "all") continue;
    out.add(key);
    for (const childKey of getDescendantKeys(key, segments)) {
      out.add(childKey);
    }
  }
  return [...out];
}

export function segmentLabelWithChildren(key: string, segments: Segment[]): string {
  const descendants = getDescendantKeys(key, segments);
  if (descendants.length === 0) return key;
  return `${key} (+${descendants.length} подгрупи)`;
}

export function isDescendantOf(
  segmentId: string,
  ancestorId: string,
  segments: Segment[],
): boolean {
  const byId = new Map(segments.map((s) => [s.id, s]));
  let current = byId.get(segmentId);
  while (current?.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = byId.get(current.parent_id);
  }
  return false;
}

export function flattenSegmentTreeWithDepth(
  segments: Segment[],
): { segment: Segment; depth: number }[] {
  const byParent = segmentsByParent(segments);
  const out: { segment: Segment; depth: number }[] = [];

  function walk(parentId: string | null, depth: number) {
    for (const s of byParent.get(parentId) ?? []) {
      out.push({ segment: s, depth });
      walk(s.id, depth + 1);
    }
  }
  walk(null, 0);
  return out;
}

export function flattenSegmentTree(segments: Segment[]): Segment[] {
  return flattenSegmentTreeWithDepth(segments).map((row) => row.segment);
}
