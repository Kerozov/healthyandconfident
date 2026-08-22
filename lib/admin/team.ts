import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AdminAuditLog, AdminUser } from "@/lib/supabase/types";
import { listRecentAdminAudit } from "@/lib/admin/audit";
import { sanitizeAdminScreens } from "@/lib/admin/screens";
import type { AdminProfileActivity, AdminProfilePublic } from "@/lib/admin/team-types";

export type { AdminProfileActivity, AdminProfilePublic } from "@/lib/admin/team-types";

export type TeamOverview = {
  tableReady: boolean;
  profiles: AdminProfileActivity[];
  feed: AdminAuditLog[];
};

function tablesMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /admin_users|admin_audit_log|schema cache/i.test(error.message ?? "");
}

function toPublic(user: AdminUser): AdminProfilePublic {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    screens: user.role === "owner" ? [] : sanitizeAdminScreens(user.screens),
    active: user.active,
    lastLoginAt: user.last_login_at,
    lastSeenAt: user.last_seen_at,
    createdAt: user.created_at,
  };
}

export async function getTeamOverview(): Promise<TeamOverview> {
  try {
    const { data, error } = await getAdminClient()
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return { tableReady: !tablesMissing(error), profiles: [], feed: [] };
    }

    const users = (data ?? []) as AdminUser[];
    const feed = await listRecentAdminAudit(80);
    const byActor = new Map<string, AdminAuditLog[]>();
    for (const row of feed) {
      if (!row.actor_id) continue;
      const list = byActor.get(row.actor_id) ?? [];
      if (list.length < 8) list.push(row);
      byActor.set(row.actor_id, list);
    }

    const profiles = users.map((user) => {
      const recent = byActor.get(user.id) ?? [];
      return {
        ...toPublic(user),
        lastAction: recent[0] ?? null,
        recent,
      };
    });

    profiles.sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      const aSeen = a.lastSeenAt ?? "";
      const bSeen = b.lastSeenAt ?? "";
      return bSeen.localeCompare(aSeen);
    });

    return { tableReady: true, profiles, feed };
  } catch {
    return { tableReady: false, profiles: [], feed: [] };
  }
}
