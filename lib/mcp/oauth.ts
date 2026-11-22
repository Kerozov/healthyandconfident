import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/worker/email";
import { MCP_OWNER_EMAIL } from "@/lib/mcp/owner";
import {
  ACCESS_TOKEN_PREFIX,
  ACCESS_TTL_MS,
  CHALLENGE_MAX_ATTEMPTS,
  CHALLENGE_TTL_MS,
  CHALLENGES_PER_HOUR,
  CODE_TTL_MS,
  hashSecret,
  isAllowedRedirectUri,
  isClientId,
  isCodeChallenge,
  newClientId,
  newEmailCode,
  newSecret,
  normalizeEmailCode,
  pkceMatches,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TTL_MS,
  redirectUriRegistered,
  sameHash,
} from "@/lib/mcp/oauth-rules";

/**
 * Хранилището на входа за конектора. Само хешове; токенът се показва веднъж —
 * в отговора към Claude. Кодът е еднократен: втори опит със същия код отменя и
 * токените, издадени с него (OAuth 2.1, т. 4.1.2).
 */

const db = () => getAdminClient();
const nowIso = () => new Date().toISOString();

export type McpClient = { id: string; name: string; redirectUris: string[] };

export async function registerClient(input: {
  name: unknown;
  redirectUris: unknown;
}): Promise<{ ok: true; client: McpClient } | { ok: false; error: string }> {
  const uris = Array.isArray(input.redirectUris) ? input.redirectUris : [];
  if (!uris.length || uris.length > 5 || !uris.every(isAllowedRedirectUri)) {
    return { ok: false, error: "redirect_uris must be 1–5 https URLs" };
  }
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const client: McpClient = { id: newClientId(), name, redirectUris: uris as string[] };
  const { error } = await db()
    .from("mcp_clients")
    .insert({ id: client.id, name: client.name, redirect_uris: client.redirectUris });
  if (error) {
    console.error("[mcp oauth] register", error.message);
    return { ok: false, error: "server_error" };
  }
  return { ok: true, client };
}

export async function readClient(clientId: unknown): Promise<McpClient | null> {
  if (!isClientId(clientId)) return null;
  const { data } = await db()
    .from("mcp_clients")
    .select("id, name, redirect_uris")
    .eq("id", clientId)
    .maybeSingle();
  return data ? { id: data.id, name: data.name, redirectUris: data.redirect_uris ?? [] } : null;
}

/** Проверява заявката от Claude, преди да се покаже „Разреши“. */
export async function validateAuthorizeRequest(params: {
  clientId: unknown;
  redirectUri: unknown;
  codeChallenge: unknown;
  codeChallengeMethod: unknown;
  responseType: unknown;
}): Promise<{ ok: true; client: McpClient } | { ok: false; message: string }> {
  const client = await readClient(params.clientId);
  if (!client) return { ok: false, message: "Непознато приложение. Добави конектора отначало в Claude." };
  if (typeof params.redirectUri !== "string" || !redirectUriRegistered(client.redirectUris, params.redirectUri)) {
    return { ok: false, message: "Адресът за връщане не е регистриран за това приложение." };
  }
  if (params.responseType !== "code") return { ok: false, message: "Поддържа се само response_type=code." };
  if (params.codeChallengeMethod !== "S256" || !isCodeChallenge(params.codeChallenge)) {
    return { ok: false, message: "Липсва PKCE (S256)." };
  }
  return { ok: true, client };
}

const challengeHash = (challengeId: string, code: string) => hashSecret(`${challengeId}:${code}`);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function challengeEmailHtml(code: string, clientName: string, redirectHost: string): string {
  return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f7fbf7;font-family:Arial,Helvetica,sans-serif;color:#1a2e1a">
<div style="max-width:560px;margin:0 auto;padding:24px;background:#fff;border-radius:12px">
<p style="color:#5a7a5a;font-size:13px">Healthy &amp; Confident · админ</p>
<h1 style="font-size:22px">Код за свързване на Claude</h1>
<p style="font-size:15px">Някой поиска да свърже <b>${escapeHtml(clientName || "Claude")}</b> (${escapeHtml(redirectHost)}) с целия админ на сайта: имейли, СМС, абонати, форми, статии и настройки.</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:24px 0">${code}</p>
<p style="font-size:14px">Кодът важи 10 минути. Въведи го само на страницата, която ти сам отвори от Claude.</p>
<p style="color:#5a7a5a;font-size:12px">Ако не си го поискал ти, не прави нищо — без кода връзката не става.</p>
</div></body></html>`;
}

export type ChallengeResult =
  | { ok: true; challengeId: string }
  | { ok: false; message: string };

/** Праща шестцифрен код на собственика. Само на неговия имейл — никога на въведен. */
export async function startEmailChallenge(client: McpClient, redirectUri: string): Promise<ChallengeResult> {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count, error: countError } = await db()
    .from("mcp_email_challenges")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (countError) {
    console.error("[mcp oauth] challenge count", countError.message);
    return { ok: false, message: "Временна грешка. Опитай пак след малко." };
  }
  if ((count ?? 0) >= CHALLENGES_PER_HOUR) {
    return { ok: false, message: "Пратени са твърде много кодове. Опитай пак след час." };
  }

  const challengeId = crypto.randomUUID();
  const code = newEmailCode();
  const { error } = await db().from("mcp_email_challenges").insert({
    id: challengeId,
    code_hash: challengeHash(challengeId, code),
    client_id: client.id,
    email: MCP_OWNER_EMAIL,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[mcp oauth] challenge insert", error.message);
    return { ok: false, message: "Временна грешка. Опитай пак след малко." };
  }

  try {
    const result = await sendEmail({
      subject: `Код за Claude: ${code}`,
      html: challengeEmailHtml(code, client.name, new URL(redirectUri).host),
      recipients: [MCP_OWNER_EMAIL],
      idempotencyKey: `mcp-challenge:${challengeId}`,
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.jobId || result.status === "failed") throw new Error("worker did not accept the email");
  } catch (err) {
    console.error("[mcp oauth] challenge email", err instanceof Error ? err.message : err);
    await db().from("mcp_email_challenges").update({ used_at: nowIso() }).eq("id", challengeId);
    return { ok: false, message: "Имейлът с кода не тръгна. Опитай пак след малко." };
  }
  return { ok: true, challengeId };
}

/**
 * Сверява кода от имейла. Пет опита на код; всеки опит се брои преди
 * сравнението, за да не може да се изреди паралелно.
 */
async function consumeEmailChallenge(input: {
  challengeId: string;
  clientId: string;
  code: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const code = normalizeEmailCode(input.code);
  if (code.length !== 6) return { ok: false, message: "Въведи шестте цифри от имейла." };
  if (!/^[0-9a-f-]{36}$/i.test(input.challengeId)) return { ok: false, message: "Поискай нов код." };

  const { data: row } = await db()
    .from("mcp_email_challenges")
    .select("id, code_hash, client_id, email, attempts, expires_at, used_at")
    .eq("id", input.challengeId)
    .maybeSingle();
  if (!row || row.client_id !== input.clientId || row.used_at) return { ok: false, message: "Поискай нов код." };
  if (Date.parse(row.expires_at) < Date.now()) return { ok: false, message: "Кодът изтече. Поискай нов." };
  if (row.attempts >= CHALLENGE_MAX_ATTEMPTS) return { ok: false, message: "Твърде много грешни опити. Поискай нов код." };

  const { data: counted } = await db()
    .from("mcp_email_challenges")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id)
    .eq("attempts", row.attempts)
    .is("used_at", null)
    .select("id");
  if (!counted?.length) return { ok: false, message: "Опитай пак." };

  if (!sameHash(challengeHash(row.id, code), row.code_hash)) {
    const left = CHALLENGE_MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, message: left > 0 ? `Грешен код. Остават ${left} опита.` : "Грешен код. Поискай нов." };
  }

  const { data: claimed } = await db()
    .from("mcp_email_challenges")
    .update({ used_at: nowIso() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id");
  if (!claimed?.length) return { ok: false, message: "Поискай нов код." };
  if (row.email !== MCP_OWNER_EMAIL) return { ok: false, message: "Поискай нов код." };
  return { ok: true, email: row.email };
}

/** Кодът от имейла е верен → еднократен код за Claude. */
export async function approveWithEmailCode(input: {
  challengeId: string;
  emailCode: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
}): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  const client = await readClient(input.clientId);
  if (!client || !redirectUriRegistered(client.redirectUris, input.redirectUri)) {
    return { ok: false, message: "Непознато приложение. Добави конектора отначало в Claude." };
  }
  if (!isCodeChallenge(input.codeChallenge)) return { ok: false, message: "Липсва PKCE (S256)." };

  const verified = await consumeEmailChallenge({
    challengeId: input.challengeId,
    clientId: client.id,
    code: input.emailCode,
  });
  if (!verified.ok) return verified;

  const code = newSecret();
  const { error } = await db().from("mcp_auth_codes").insert({
    code_hash: hashSecret(code),
    client_id: client.id,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    email: verified.email,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[mcp oauth] code", error.message);
    return { ok: false, message: "Временна грешка. Опитай пак." };
  }
  return { ok: true, code };
}

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export type TokenResult =
  | { ok: true; body: TokenResponse }
  | { ok: false; error: string; description: string };

const SCOPE = "admin";

async function mint(clientId: string, email: string): Promise<TokenResponse | null> {
  const access = newSecret(ACCESS_TOKEN_PREFIX);
  const refresh = newSecret(REFRESH_TOKEN_PREFIX);
  const now = Date.now();
  const { error } = await db().from("mcp_tokens").insert({
    client_id: clientId,
    email,
    access_hash: hashSecret(access),
    refresh_hash: hashSecret(refresh),
    access_expires_at: new Date(now + ACCESS_TTL_MS).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[mcp oauth] mint", error.message);
    return null;
  }
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_MS / 1000,
    refresh_token: refresh,
    scope: SCOPE,
  };
}

const invalid = (description: string): TokenResult => ({ ok: false, error: "invalid_grant", description });

export async function exchangeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResult> {
  if (!input.code || !input.codeVerifier) {
    return { ok: false, error: "invalid_request", description: "code and code_verifier are required" };
  }
  const hash = hashSecret(input.code);
  const { data: row } = await db()
    .from("mcp_auth_codes")
    .select("client_id, redirect_uri, code_challenge, email, expires_at, used_at")
    .eq("code_hash", hash)
    .maybeSingle();
  if (!row) return invalid("unknown code");

  if (row.used_at) {
    // Повторен код е откраднат код — токените, издадени с него, падат.
    await db()
      .from("mcp_tokens")
      .update({ revoked_at: nowIso() })
      .eq("client_id", row.client_id)
      .gte("created_at", row.used_at);
    return invalid("code already used");
  }
  if (Date.parse(row.expires_at) < Date.now()) return invalid("code expired");
  if (row.client_id !== input.clientId || row.redirect_uri !== input.redirectUri) {
    return invalid("client or redirect_uri mismatch");
  }
  if (!pkceMatches(input.codeVerifier, row.code_challenge)) return invalid("PKCE verification failed");
  if (row.email !== MCP_OWNER_EMAIL) return invalid("owner changed");

  // Пазачът `used_at is null` в самата заявка: два паралелни обмена — един токен.
  const { data: claimed } = await db()
    .from("mcp_auth_codes")
    .update({ used_at: nowIso() })
    .eq("code_hash", hash)
    .is("used_at", null)
    .select("code_hash");
  if (!claimed?.length) return invalid("code already used");

  const body = await mint(row.client_id, row.email);
  return body ? { ok: true, body } : { ok: false, error: "server_error", description: "try again" };
}

export async function refreshTokens(input: { refreshToken: string; clientId: string }): Promise<TokenResult> {
  if (!input.refreshToken?.startsWith(REFRESH_TOKEN_PREFIX)) return invalid("unknown refresh token");
  const { data: row } = await db()
    .from("mcp_tokens")
    .select("id, client_id, email, refresh_expires_at, revoked_at")
    .eq("refresh_hash", hashSecret(input.refreshToken))
    .maybeSingle();
  if (!row || row.revoked_at) return invalid("unknown refresh token");
  if (row.client_id !== input.clientId) return invalid("client mismatch");
  if (Date.parse(row.refresh_expires_at) < Date.now()) return invalid("refresh token expired");
  if (row.email !== MCP_OWNER_EMAIL) return invalid("owner changed");
  // Ротация: старият ред пада в същия миг, в който се издава новият.
  const { data: revoked } = await db()
    .from("mcp_tokens")
    .update({ revoked_at: nowIso() })
    .eq("id", row.id)
    .is("revoked_at", null)
    .select("id");
  if (!revoked?.length) return invalid("unknown refresh token");
  const body = await mint(row.client_id, row.email);
  return body ? { ok: true, body } : { ok: false, error: "server_error", description: "try again" };
}

export type McpGrant = { tokenId: string; clientId: string; email: string };

/** Чий е токенът. `null` — непознат, изтекъл, отменен или от друг собственик. */
export async function grantForAccessToken(token: string): Promise<McpGrant | null> {
  const { data: row } = await db()
    .from("mcp_tokens")
    .select("id, client_id, email, access_expires_at, revoked_at, last_used_at")
    .eq("access_hash", hashSecret(token))
    .maybeSingle();
  if (!row || row.revoked_at || Date.parse(row.access_expires_at) < Date.now()) return null;
  if (row.email !== MCP_OWNER_EMAIL) return null;
  // Веднъж на десет минути е достатъчно за „използван последно“.
  if (!row.last_used_at || Date.now() - Date.parse(row.last_used_at) > 10 * 60_000) {
    await db().from("mcp_tokens").update({ last_used_at: nowIso() }).eq("id", row.id);
  }
  return { tokenId: row.id, clientId: row.client_id, email: row.email };
}

export type McpConnection = { clientId: string; name: string; createdAt: string; lastUsedAt: string | null };

/** Свързаните Claude-и — по един ред на приложение, най-новият токен. */
export async function listConnections(): Promise<McpConnection[]> {
  const { data: tokens } = await db()
    .from("mcp_tokens")
    .select("client_id, created_at, last_used_at")
    .is("revoked_at", null)
    .gt("refresh_expires_at", nowIso())
    .order("created_at", { ascending: false })
    .limit(200);
  const ids = [...new Set((tokens ?? []).map((row) => row.client_id))];
  if (!ids.length) return [];
  const { data: clients } = await db().from("mcp_clients").select("id, name").in("id", ids);
  const names = new Map((clients ?? []).map((client) => [client.id, client.name]));
  const seen = new Map<string, McpConnection>();
  for (const row of tokens ?? []) {
    if (seen.has(row.client_id)) continue;
    seen.set(row.client_id, {
      clientId: row.client_id,
      name: names.get(row.client_id) || "Claude",
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    });
  }
  return [...seen.values()];
}

export async function revokeConnection(clientId: string): Promise<boolean> {
  if (!isClientId(clientId)) return false;
  const { error } = await db()
    .from("mcp_tokens")
    .update({ revoked_at: nowIso() })
    .eq("client_id", clientId)
    .is("revoked_at", null);
  return !error;
}
