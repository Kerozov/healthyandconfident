"use client";

import { AdminNavigationProvider } from "@/components/admin/admin-navigation";
import { Sidebar } from "@/components/admin/sidebar";
import type { AdminActorPublic } from "@/lib/admin/actor-types";

export function AdminPanelShell({
  actor,
  children,
}: {
  actor: AdminActorPublic;
  children: React.ReactNode;
}) {
  return (
    <AdminNavigationProvider>
      <div className="flex min-h-screen flex-col bg-cream-2/40 lg:flex-row">
        <Sidebar actor={actor} />
        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
        >
          {children}
        </main>
      </div>
    </AdminNavigationProvider>
  );
}
