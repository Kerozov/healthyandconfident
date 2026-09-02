import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { EN_RECIPIENT_TAG } from "@/i18n/subscriber-locale";

const SEGMENT_LABELS: Record<string, { name: string; description: string }> = {
  [EN_RECIPIENT_TAG]: {
    name: "English",
    description: "Subscribers on the English site or English-speaking imports.",
  },
};

/** Segment keys must exist in the catalog, or admin pickers cannot target them. */
export async function ensureSubscriberSegmentKeys(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const supabase = getAdminClient();
  const { data } = await supabase.from("segments").select("key").in("key", unique);
  const existing = new Set(((data as { key: string }[] | null) ?? []).map((s) => s.key));

  const missing = unique.filter((key) => !existing.has(key));
  if (missing.length === 0) return;

  const { error } = await supabase.from("segments").insert(
    missing.map((key) => ({
      key,
      name: SEGMENT_LABELS[key]?.name ?? key,
      description:
        SEGMENT_LABELS[key]?.description ?? "Auto-created during subscriber import.",
    })),
  );

  if (error) console.error("[segments] ensure:", error.message);
}
