import "server-only";
import { cookies } from "next/headers";

const ADMIN_COOKIE = "hc_admin";

export function getAdminCookieName(): string {
  return ADMIN_COOKIE;
}

export async function hasAdminSession(): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === secret;
}

export async function requireAdmin(): Promise<void> {
  const ok = await hasAdminSession();
  if (!ok) {
    throw new Error("UNAUTHORIZED");
  }
}
