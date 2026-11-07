import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { chunkArray } from "@/lib/utils";
import type {
  ContactStatus,
  SubscriberHistoryEntry,
  SubscriberHistoryKind,
} from "@/lib/supabase/types";

/**
 * Statuses and per-person history (migration 088).
 *
 * Until the migration has run the tables are missing. Reads then come back
 * empty with `available: false`, so the screens show a note instead of
 * breaking, and history writes are skipped quietly.
 */

export function crmTablesMissing(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "42703") {
    return true;
  }
  return /contact_statuses|subscriber_history|crm_status|schema cache/i.test(
    error.message ?? "",
  );
}

export async function getContactStatuses(): Promise<{
  statuses: ContactStatus[];
  available: boolean;
}> {
  const { data, error } = await getAdminClient()
    .from("contact_statuses")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    if (!crmTablesMissing(error)) {
      console.error("[contact-statuses] list:", error.message);
    }
    return { statuses: [], available: !crmTablesMissing(error) };
  }
  return { statuses: (data as ContactStatus[]) ?? [], available: true };
}

export async function getSubscriberHistory(
  subscriberId: string,
): Promise<SubscriberHistoryEntry[]> {
  const { data, error } = await getAdminClient()
    .from("subscriber_history")
    .select("*")
    .eq("subscriber_id", subscriberId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(500);
  if (error) {
    if (!crmTablesMissing(error)) {
      console.error("[contact-statuses] history:", error.message);
    }
    return [];
  }
  return (data as SubscriberHistoryEntry[]) ?? [];
}

export type SubscriberHistoryInput = {
  subscriber_id: string;
  kind: SubscriberHistoryKind;
  status_id?: string | null;
  status_name?: string | null;
  status_color?: string | null;
  previous_status_name?: string | null;
  comment?: string | null;
  details?: Record<string, unknown>;
  actor_id?: string | null;
  actor_name: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Best effort: a missing table or a failed insert never undoes the change itself. */
export async function recordSubscriberHistory(
  entries: SubscriberHistoryInput[],
): Promise<void> {
  if (entries.length === 0) return;
  const supabase = getAdminClient();
  for (const batch of chunkArray(entries, 200)) {
    const { error } = await supabase.from("subscriber_history").insert(
      batch.map((e) => ({
        subscriber_id: e.subscriber_id,
        kind: e.kind,
        status_id: e.status_id ?? null,
        status_name: e.status_name ?? null,
        status_color: e.status_color ?? null,
        previous_status_name: e.previous_status_name ?? null,
        comment: e.comment?.trim() || null,
        details: e.details ?? {},
        actor_id: e.actor_id && UUID_RE.test(e.actor_id) ? e.actor_id : null,
        actor_name: e.actor_name,
      })),
    );
    if (error) {
      if (!crmTablesMissing(error)) {
        console.error("[contact-statuses] history insert:", error.message);
      }
      return;
    }
  }
}

/** Tags added and removed by one save, for the "groups" history line. */
export function diffTags(
  before: string[],
  after: string[],
): { added: string[]; removed: string[] } {
  const b = new Set(before.map((t) => t.trim()).filter(Boolean));
  const a = new Set(after.map((t) => t.trim()).filter(Boolean));
  return {
    added: [...a].filter((t) => !b.has(t)),
    removed: [...b].filter((t) => !a.has(t)),
  };
}
