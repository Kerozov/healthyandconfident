import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Admin access is gated by Clerk sign-in + an email allowlist (ADMIN_EMAILS,
 * comma-separated). Both Vessie and the developer can be added there.
 *
 * While Clerk is not configured (keys empty), auth is bypassed so the /admin
 * panel is usable during setup. Filling the Clerk keys turns auth back on.
 */
export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  );
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdmin(): Promise<boolean> {
  // Bypass while Clerk is not set up yet.
  if (!isClerkEnabled()) return true;

  const { userId } = await auth();
  if (!userId) return false;

  const allow = getAdminEmails();
  // If no allowlist is configured, any signed-in user is treated as admin
  // (useful for first-run setup). Configure ADMIN_EMAILS in production.
  if (allow.length === 0) return true;

  const user = await currentUser();
  const emails = (user?.emailAddresses ?? []).map((e) =>
    e.emailAddress.toLowerCase(),
  );
  return emails.some((e) => allow.includes(e));
}

export async function requireAdmin(): Promise<void> {
  const ok = await isAdmin();
  if (!ok) {
    throw new Error("UNAUTHORIZED");
  }
}
