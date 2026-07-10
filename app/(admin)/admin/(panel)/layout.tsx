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
    <>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Към съдържанието
      </a>
      <div className="flex min-h-screen flex-col bg-cream-2/40 lg:flex-row">
        <Sidebar />
        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
        >
          {children}
        </main>
      </div>
    </>
  );
}
