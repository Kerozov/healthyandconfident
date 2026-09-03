import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { chunkArray } from "@/lib/utils";

const ID_CHUNK = 40;

export type BulkDeleteResult = {
  ok: boolean;
  deleted: number;
  message?: string;
};

/**
 * Delete subscribers by id in small DB batches.
 * Marks queued mail canceled in DB first (no worker HTTP calls).
 */
export async function deleteSubscribersByIds(
  ids: string[],
): Promise<BulkDeleteResult> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { ok: false, deleted: 0, message: "Няма избрани абонати." };
  }
  if (unique.length > 100) {
    return {
      ok: false,
      deleted: 0,
      message: "Максимум 100 абоната на заявка. Опитай отново с по-малък брой.",
    };
  }

  const supabase = getAdminClient();
  const subscribers: { id: string; email: string }[] = [];

  for (const batch of chunkArray(unique, ID_CHUNK)) {
    const { data: rows, error: loadError } = await supabase
      .from("subscribers")
      .select("id, email")
      .in("id", batch);

    if (loadError) {
      return { ok: false, deleted: 0, message: loadError.message };
    }
    subscribers.push(
      ...((rows as { id: string; email: string }[] | null) ?? []),
    );
  }

  if (subscribers.length === 0) {
    return {
      ok: false,
      deleted: 0,
      message: "Избраните абонати не са намерени в базата.",
    };
  }

  try {
    const { markScheduledMailCanceledForEmails } = await import(
      "@/lib/automation/cancel"
    );
    await markScheduledMailCanceledForEmails(
      subscribers.map((row) => row.email),
    );
  } catch (err) {
    console.error(
      "[deleteSubscribersByIds] cancel mail:",
      err instanceof Error ? err.message : err,
    );
  }

  let deleted = 0;
  for (const batch of chunkArray(
    subscribers.map((row) => row.id),
    ID_CHUNK,
  )) {
    const { error } = await supabase.from("subscribers").delete().in("id", batch);
    if (error) {
      return {
        ok: false,
        deleted,
        message:
          deleted > 0
            ? `${error.message} (изтрити ${deleted} преди грешката)`
            : error.message,
      };
    }
    deleted += batch.length;
  }

  return { ok: true, deleted };
}
