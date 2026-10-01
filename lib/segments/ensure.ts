import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { EN_RECIPIENT_TAG } from "@/i18n/subscriber-locale";

const SEGMENT_LABELS: Record<string, { name: string; description: string }> = {
  [EN_RECIPIENT_TAG]: {
    name: "English",
    description: "Subscribers on the English site or English-speaking imports.",
  },
};

/** Readable name (and container group) for a segment an import is about to create. */
export type SegmentSeed = {
  key: string;
  name: string;
  group?: string;
};

/** Top-level segment groups by name, created when missing. */
async function ensureRootSegmentGroups(names: string[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (names.length === 0) return ids;

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("segment_groups")
    .select("id, name")
    .is("parent_id", null)
    .in("name", names);
  for (const row of (data as { id: string; name: string }[] | null) ?? []) {
    if (!ids.has(row.name)) ids.set(row.name, row.id);
  }

  const missing = names.filter((name) => !ids.has(name));
  if (missing.length === 0) return ids;

  const { data: created, error } = await supabase
    .from("segment_groups")
    .insert(
      missing.map((name) => ({
        name,
        description: "Групи, внесени с импорт на абонати.",
      })),
    )
    .select("id, name");
  if (error) console.error("[segments] ensure groups:", error.message);
  for (const row of (created as { id: string; name: string }[] | null) ?? []) {
    ids.set(row.name, row.id);
  }
  return ids;
}

/** Segment keys must exist in the catalog, or admin pickers cannot target them. */
export async function ensureSubscriberSegmentKeys(
  keys: string[],
  seeds: SegmentSeed[] = [],
): Promise<void> {
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const supabase = getAdminClient();
  const { data } = await supabase.from("segments").select("key").in("key", unique);
  const existing = new Set(((data as { key: string }[] | null) ?? []).map((s) => s.key));

  const missing = unique.filter((key) => !existing.has(key));
  if (missing.length === 0) return;

  const seedByKey = new Map(seeds.map((seed) => [seed.key, seed]));
  const groupIds = await ensureRootSegmentGroups([
    ...new Set(
      missing
        .map((key) => seedByKey.get(key)?.group?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ]);

  // ignoreDuplicates: a signup creating the same key meanwhile must not sink the batch.
  const { error } = await supabase.from("segments").upsert(
    missing.map((key) => {
      const seed = seedByKey.get(key);
      const group = seed?.group?.trim();
      return {
        key,
        name: SEGMENT_LABELS[key]?.name ?? (seed?.name.trim() || key),
        description:
          SEGMENT_LABELS[key]?.description ??
          (group
            ? `Група „${seed?.name.trim()}“ от ${group}.`
            : "Auto-created during subscriber import."),
        group_id: (group && groupIds.get(group)) || null,
      };
    }),
    { onConflict: "key", ignoreDuplicates: true },
  );

  if (error) console.error("[segments] ensure:", error.message);
}
