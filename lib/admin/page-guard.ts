import "server-only";

import { redirect } from "next/navigation";
import {
  getAdminSession,
  sessionCanAccess,
  type AdminSession,
} from "@/lib/admin/auth";
import type { AdminScreenKey } from "@/lib/admin/screens";

export async function requireAdminPage(
  screen?: AdminScreenKey | "team",
): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  if (screen === "team") {
    if (session.role !== "owner") redirect("/admin");
    return session;
  }

  if (screen && screen !== "dashboard" && !sessionCanAccess(session, screen)) {
    redirect("/admin");
  }

  return session;
}
