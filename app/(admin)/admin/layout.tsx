import { SignOutButton } from "@clerk/nextjs";
import { isAdmin, isClerkEnabled } from "@/lib/admin/auth";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();

  if (!ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-2xl font-semibold">Access denied</h1>
        <p className="max-w-sm text-sm text-ink-soft">
          This account is not on the admin allowlist. Ask the site owner to add
          your email to <code>ADMIN_EMAILS</code>.
        </p>
        <SignOutButton>
          <button className="rounded-full bg-forest-600 px-5 py-2.5 text-sm font-semibold text-cream">
            Sign out
          </button>
        </SignOutButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-5 sm:p-8">
        {!isClerkEnabled() && (
          <div className="mb-6 rounded-xl border border-gold-400/40 bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
            ⚠️ <strong>No-auth mode</strong> — the admin panel is currently open
            without login. Add your Clerk keys to <code>.env</code> to enable
            sign-in protection.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
