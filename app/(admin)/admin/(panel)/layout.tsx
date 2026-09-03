import { redirect } from "next/navigation";
import { getAdminSession, toPublicActor } from "@/lib/admin/auth";
import { AdminPanelShell } from "@/components/admin/admin-panel-shell";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getAdminSession();
  } catch (err) {
    console.error(
      "[admin/layout] session:",
      err instanceof Error ? err.message : err,
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
