import type { AdminScreenKey } from "@/lib/admin/screens";

export type AdminActorPublic = {
  id: string | null;
  username: string;
  displayName: string;
  role: "owner" | "member";
  screens: AdminScreenKey[];
};
