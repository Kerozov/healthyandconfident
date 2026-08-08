import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { IntegrationSyncState } from "@/lib/supabase/types";

/** Missing table (migration 049 not applied yet) must not crash the admin page. */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export async function getSyncState(
  integration: string,
): Promise<IntegrationSyncState | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("integration_sync_state")
      .select("*")
      .eq("integration", integration)
      .maybeSingle();

    if (error) {
      if (!isMissingTable(error)) console.error("[sync-state] read:", error.message);
      return null;
    }
    return (data as IntegrationSyncState) ?? null;
  } catch {
    return null;
  }
}

export async function saveSyncState(
  integration: string,
  patch: Partial<Omit<IntegrationSyncState, "integration" | "updated_at">>,
): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("integration_sync_state").upsert(
      {
        integration,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "integration" },
    );
    if (error && !isMissingTable(error)) {
      console.error("[sync-state] write:", error.message);
    }
  } catch (err) {
    console.error("[sync-state] write:", err);
  }
}
