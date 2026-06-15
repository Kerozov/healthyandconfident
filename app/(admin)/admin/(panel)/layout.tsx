import { redirect } from "next/navigation";
import { hasAdminSession } from "@/lib/admin/auth";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await hasAdminSession();
  if (!authed) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-5 sm:p-8">{children}</main>
    </div>
  );
}
