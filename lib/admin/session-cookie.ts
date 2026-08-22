import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type SessionPayload = {
  u: string;
  iat: number;
  exp: number;
};

function signingSecret(): string | null {
  return process.env.ADMIN_SECRET?.trim() || null;
}

export function getAdminSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

export function signAdminSessionToken(userId: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      u: userId,
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    } satisfies SessionPayload),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(`v1.${payload}`).digest("base64url");
  return `v1.${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string): { userId: string } | null {
  const secret = signingSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, payload, sig] = parts;
  const expected = createHmac("sha256", secret)
    .update(`v1.${payload}`)
    .digest("base64url");

  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!data.u || typeof data.u !== "string") return null;
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return { userId: data.u };
  } catch {
    return null;
  }
}
