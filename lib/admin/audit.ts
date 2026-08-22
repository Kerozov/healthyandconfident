import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AdminAuditLog } from "@/lib/supabase/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminAuditInput = {
  screen?: string;
  action: string;
  summary: string;
  entityType?: string;
  entityId?: string;
};

export type AuditActor = {
  id: string | null;
  username: string;
  displayName: string;
};

function tablesMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /admin_users|admin_audit_log|schema cache/i.test(error.message ?? "");
}

export async function insertAdminAudit(
  actor: AuditActor,
  entry: AdminAuditInput,
): Promise<void> {
  try {
    const { error } = await getAdminClient().from("admin_audit_log").insert({
      actor_id: actor.id && UUID_RE.test(actor.id) ? actor.id : null,
      actor_username: actor.username,
      actor_name: actor.displayName,
      screen: entry.screen ?? "",
      action: entry.action,
      summary: entry.summary,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
    });
    if (error && !tablesMissing(error)) {
      console.error("admin audit insert failed", error.message);
    }
  } catch (err) {
    console.error("admin audit insert failed", err);
  }
}

export function logAdminChange(actor: AuditActor, entry: AdminAuditInput): void {
  void insertAdminAudit(actor, entry);
}

export async function listRecentAdminAudit(limit = 40): Promise<AdminAuditLog[]> {
  try {
    const { data, error } = await getAdminClient()
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as AdminAuditLog[];
  } catch {
    return [];
  }
}

export async function listAdminAuditForActors(
  limit = 200,
): Promise<AdminAuditLog[]> {
  return listRecentAdminAudit(limit);
}
