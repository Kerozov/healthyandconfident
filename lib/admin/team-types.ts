import type { AdminAuditLog } from "@/lib/supabase/types";
import type { AdminScreenKey } from "@/lib/admin/screens";
import type { AdminNotificationSettings } from "@/lib/admin/notification-preferences";

export type AdminProfilePublic = AdminNotificationSettings & {
  id: string;
  username: string;
  displayName: string;
  role: "owner" | "member";
  screens: AdminScreenKey[];
  active: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
};

export type AdminProfileActivity = AdminProfilePublic & {
  lastAction: AdminAuditLog | null;
  recent: AdminAuditLog[];
};
