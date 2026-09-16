import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/lib/supabase/types";
import {
  ADMIN_SCREEN_GROUPS,
  ADMIN_SCREEN_KEYS,
  sanitizeAdminScreens,
  type AdminScreenKey,
} from "@/lib/admin/screens";
import { safeEqualSecret, verifyPassword } from "@/lib/admin/passwords";
import { verifyAdminSessionToken } from "@/lib/admin/session-cookie";
import { logAdminChange, type AdminAuditInput } from "@/lib/admin/audit";
import { normalizeUsername } from "@/lib/admin/usernames";
import type { AdminActorPublic } from "@/lib/admin/actor-types";

const ADMIN_COOKIE = "hc_admin";
const SEEN_THROTTLE_MS = 2 * 60 * 1000;
/**
 * A hanging Supabase used to hang the whole panel — no answer, no error, ever.
 * Every session query is capped, and postgrest's own retry (1s/2s/4s backoff,
 * three attempts) is switched off so the wait stays predictable: the retry
 * below owns it instead.
 */
const SESSION_QUERY_TIMEOUT_MS = 4000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AdminAccessError extends Error {
  constructor(message = "Нямаш достъп до тази функция.") {
    super(message);
    this.name = "AdminAccessError";
  }
}

/**
 * The session could not be *resolved* — Supabase timed out, refused the
 * connection or answered 5xx. This is NOT a signed-out user, so callers must
 * show an error instead of redirecting to the login screen.
 */
export class AdminSessionUnavailableError extends Error {
  readonly detail: string;

  constructor(detail = "") {
    super("Връзката с базата се разпадна за момент.");
    this.name = "AdminSessionUnavailableError";
    this.detail = detail;
  }
}

export type AdminSession = AdminActorPublic;

export function getAdminCookieName(): string {
  return ADMIN_COOKIE;
}

export function toPublicActor(session: AdminSession): AdminActorPublic {
  return {
    id: session.id,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    screens: session.screens,
  };
}

export function sessionCanAccess(
  session: AdminSession,
  screen: AdminScreenKey,
): boolean {
  if (session.role === "owner") return true;
  return session.screens.includes(screen);
}

export function sessionCanAccessAny(
  session: AdminSession,
  screens: readonly AdminScreenKey[],
): boolean {
  if (session.role === "owner") return true;
  return screens.some((screen) => session.screens.includes(screen));
}

function adminSecret(): string | null {
  return process.env.ADMIN_SECRET?.trim() || null;
}

function tablesMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return /admin_users|admin_audit_log|schema cache/i.test(error.message ?? "");
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function toSession(user: AdminUser): AdminSession {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    screens:
      user.role === "owner"
        ? [...ADMIN_SCREEN_KEYS]
        : sanitizeAdminScreens(user.screens),
  };
}

function virtualOwnerSession(): AdminSession {
  return {
    id: null,
    username: "admin",
    displayName: "Главен админ",
    role: "owner",
    screens: [...ADMIN_SCREEN_KEYS],
  };
}

async function selectOwner(): Promise<AdminUser | null> {
  try {
    const { data, error } = await getAdminClient()
      .from("admin_users")
      .select("*")
      .eq("role", "owner")
      .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS))
      .maybeSingle();
    if (error || !data) {
      if (tablesMissing(error)) return null;
      return null;
    }
    return data as AdminUser;
  } catch {
    return null;
  }
}

export async function ensureOwnerRow(): Promise<AdminUser | null> {
  const existing = await selectOwner();
  if (existing) return existing;

  try {
    const { data, error } = await getAdminClient()
      .from("admin_users")
      .insert({
        username: "admin",
        display_name: "Главен админ",
        role: "owner",
        screens: [],
        active: true,
      })
      .select("*")
      .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS))
      .single();
    if (!error && data) return data as AdminUser;
    return selectOwner();
  } catch {
    return selectOwner();
  }
}

/**
 * A failed lookup is not a missing user. Swallowing the error and returning
 * `null` made every Supabase hiccup look like a signed-out session, which
 * bounced team members to /admin/login in the middle of a save. Only a
 * genuinely absent row returns `null`; transient failures retry once and then
 * throw so the caller can show an error and keep the user logged in.
 */
async function loadUserById(id: string): Promise<AdminUser | null> {
  if (!isUuid(id)) return null;

  let detail = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 200));
    try {
      const { data, error } = await getAdminClient()
        .from("admin_users")
        .select("*")
        .eq("id", id)
        .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS))
        .maybeSingle();
      if (!error) return (data as AdminUser | null) ?? null;
      if (tablesMissing(error)) return null;
      detail = error.message;
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
  }

  throw new AdminSessionUnavailableError(detail);
}

async function loadUserByUsername(username: string): Promise<AdminUser | null> {
  try {
    const { data, error } = await getAdminClient()
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS))
      .maybeSingle();
    if (error || !data) return null;
    return data as AdminUser;
  } catch {
    return null;
  }
}

async function touchLastSeen(user: AdminUser): Promise<void> {
  const last = user.last_seen_at ? Date.parse(user.last_seen_at) : 0;
  if (last && Date.now() - last < SEEN_THROTTLE_MS) return;
  try {
    await getAdminClient()
      .from("admin_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id)
      .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS));
  } catch {
    /* ignore */
  }
}

async function markLogin(user: AdminUser): Promise<void> {
  const now = new Date().toISOString();
  try {
    await getAdminClient()
      .from("admin_users")
      .update({ last_login_at: now, last_seen_at: now })
      .eq("id", user.id)
      .retry(false)
      .abortSignal(AbortSignal.timeout(SESSION_QUERY_TIMEOUT_MS));
  } catch {
    /* ignore */
  }
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const secret = adminSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!raw) return null;

  if (safeEqualSecret(raw, secret)) {
    const owner = await ensureOwnerRow();
    if (!owner) return virtualOwnerSession();
    if (!owner.active) return null;
    void touchLastSeen(owner);
    return toSession(owner);
  }

  const parsed = verifyAdminSessionToken(raw);
  if (!parsed) return null;

  const user = await loadUserById(parsed.userId);
  if (!user || !user.active) return null;
  void touchLastSeen(user);
  return toSession(user);
});

export async function hasAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export async function requireAdmin(
  screen?: AdminScreenKey | readonly AdminScreenKey[],
  audit?: AdminAuditInput,
): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    throw new AdminAccessError("UNAUTHORIZED");
  }

  if (typeof screen === "string") {
    if (!sessionCanAccess(session, screen)) {
      throw new AdminAccessError("Нямаш достъп до тази функция.");
    }
  } else if (screen) {
    if (!sessionCanAccessAny(session, screen)) {
      throw new AdminAccessError("Нямаш достъп до тази функция.");
    }
  }

  if (audit) {
    const screenKey = typeof screen === "string" ? screen : screen?.[0];
    logAdminChange(session, {
      ...audit,
      screen: audit.screen || screenKey || "account",
    });
  }

  return session;
}

export async function requireOwner(audit?: AdminAuditInput): Promise<AdminSession> {
  const session = await requireAdmin(undefined, audit);
  if (session.role !== "owner") {
    throw new AdminAccessError("Само главният админ има достъп.");
  }
  return session;
}

export type AdminLoginResult =
  | { ok: true; session: AdminSession }
  | { ok: false; message: string };

export async function authenticateAdmin(input: {
  username?: string;
  password: string;
}): Promise<AdminLoginResult> {
  const secret = adminSecret();
  if (!secret) {
    return { ok: false, message: "ADMIN_SECRET не е настроен." };
  }

  const password = input.password;
  const rawUsername = (input.username ?? "").trim();
  const username = normalizeUsername(rawUsername) ?? "";
  const master = safeEqualSecret(password, secret);

  if (master && (rawUsername === "" || username === "admin")) {
    const owner = await ensureOwnerRow();
    const session = owner ? toSession(owner) : virtualOwnerSession();
    if (owner) await markLogin(owner);
    logAdminChange(session, {
      screen: "account",
      action: "login",
      summary: "Влезе в админ панела",
    });
    return { ok: true, session };
  }

  if (!username) {
    return { ok: false, message: "Въведи потребителско име и парола." };
  }

  const user = await loadUserByUsername(username);
  if (!user || !user.active) {
    return { ok: false, message: "Грешно име или парола." };
  }

  if (user.role === "owner" && master) {
    await markLogin(user);
    const session = toSession(user);
    logAdminChange(session, {
      screen: "account",
      action: "login",
      summary: "Влезе в админ панела",
    });
    return { ok: true, session };
  }

  const passwordOk = await verifyPassword(password, user.password_hash);
  if (!passwordOk) {
    return { ok: false, message: "Грешно име или парола." };
  }

  await markLogin(user);
  const session = toSession(user);
  logAdminChange(session, {
    screen: "account",
    action: "login",
    summary: "Влезе в админ панела",
  });
  return { ok: true, session };
}

export function firstAllowedAdminPath(session: AdminSession): string {
  if (session.role === "owner" || session.screens.includes("dashboard")) {
    return "/admin";
  }
  for (const group of ADMIN_SCREEN_GROUPS) {
    for (const screen of group.screens) {
      if (session.screens.includes(screen.key)) return screen.href;
    }
  }
  return "/admin";
}
