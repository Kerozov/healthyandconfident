import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admin/page-guard";
import type { AdminScreenKey } from "@/lib/admin/screens";

export function createAdminScreenLayout(screen: AdminScreenKey | "team") {
  return async function AdminScreenLayout({
    children,
  }: {
    children: ReactNode;
  }) {
    await requireAdminPage(screen);
    return children;
  };
}
