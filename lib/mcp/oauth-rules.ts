import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Правилата на входа за конектора на Claude — без IO, за да се тестват.
 *
 * Сайтът е сървърът за вход (OAuth 2.1): Claude се регистрира сам (DCR), праща
 * собственика на `/admin/connect/claude`, той потвърждава с код от имейла си,
 * и Claude получава еднократен код, който сменя за токен с PKCE.
 */

export const ACCESS_TOKEN_PREFIX = "hcmcp_";
export const REFRESH_TOKEN_PREFIX = "hcmcpr_";
export const CLIENT_ID_PREFIX = "hcc_";

export const ACCESS_TTL_MS = 60 * 60_000;
export const REFRESH_TTL_MS = 90 * 24 * 60 * 60_000;
export const CODE_TTL_MS = 5 * 60_000;
export const CHALLENGE_TTL_MS = 10 * 60_000;
export const CHALLENGE_MAX_ATTEMPTS = 5;
/** Колко кода за потвърждение може да тръгнат за час — общо, не на адрес. */
export const CHALLENGES_PER_HOUR = 6;

export const hashSecret = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const newSecret = (prefix = ""): string =>
  `${prefix}${randomBytes(32).toString("base64url")}`;

export const newClientId = (): string =>
  `${CLIENT_ID_PREFIX}${randomBytes(12).toString("base64url")}`;

export const isClientId = (value: unknown): value is string =>
  typeof value === "string" && /^hcc_[A-Za-z0-9_-]{8,40}$/.test(value);

/** Шест цифри за имейла. */
export const newEmailCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const normalizeEmailCode = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\D/g, "").slice(0, 6) : "";

export const sameHash = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/** S256: base64url(sha256(verifier)) трябва да е предизвикателството от началото. */
export const pkceMatches = (verifier: string, challenge: string): boolean => {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
};

export const isCodeChallenge = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

/**
 * Адрес за връщане при регистрация. Само https — освен localhost за разработка.
 * Без фрагмент: кодът пътува в заявката.
 */
export const isAllowedRedirectUri = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 500) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash || url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
};

/** Адресът трябва да е **точно** един от регистрираните — никакво префиксно съвпадение. */
export const redirectUriRegistered = (
  registered: readonly string[],
  redirectUri: string,
): boolean => registered.includes(redirectUri);

export const readBearer = (header: string | null): string | null => {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? "");
  return match && match[1].startsWith(ACCESS_TOKEN_PREFIX) ? match[1] : null;
};

/** `z***v@gmail.com` — за екрана, без да се показва целият адрес. */
export const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const head = user.slice(0, 1);
  const tail = user.length > 2 ? user.slice(-1) : "";
  return `${head}***${tail}@${domain}`;
};

/** Адрес за връщане с кода и `state` от Claude. */
export const redirectWithCode = (
  redirectUri: string,
  params: { code?: string; state?: string; error?: string },
): string => {
  const url = new URL(redirectUri);
  if (params.code) url.searchParams.set("code", params.code);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.state) url.searchParams.set("state", params.state);
  return url.toString();
};
