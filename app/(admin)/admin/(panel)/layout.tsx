import { redirect } from "next/navigation";
import {
  AdminSessionUnavailableError,
  getAdminSession,
  toPublicActor,
  type AdminSession,
} from "@/lib/admin/auth";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";
import { AdminSessionError } from "@/components/admin/admin-session-error";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: AdminSession | null = null;
  try {
    session = await getAdminSession();
  } catch (err) {
    // The database blinked — the cookie is still good. Show the error and let
    // the user retry instead of throwing them out to the login screen.
    if (err instanceof AdminSessionUnavailableError) {
      console.error("[admin/layout] session unavailable:", err.detail);
      return <AdminSessionError detail={err.detail || undefined} />;
    }
    console.error(
      "[admin/layout] session:",
      err instanceof Error ? err.message : err,
    );
    return (
      <AdminSessionError
        detail={err instanceof Error ? err.message : undefined}
      />
    );
  }

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Към съдържанието
      </a>
      <AdminPanelShell actor={toPublicActor(session)}>{children}</AdminPanelShell>
    </>
  );
}
