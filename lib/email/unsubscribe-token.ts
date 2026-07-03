import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

function signingSecret(): string | null {
  return (
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    null
  );
}

function base64url(data: string): string {
  return Buffer.from(data, "utf8").toString("base64url");
}

function fromBase64url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

/** Signed token encoding a subscriber email (no expiry — old emails must still work). */
export function createUnsubscribeToken(email: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const normalized = email.trim().toLowerCase();
  const payload = base64url(JSON.stringify({ e: normalized }));
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { email: string } | null {
  const secret = signingSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

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
    const data = JSON.parse(fromBase64url(payload)) as { e?: string };
    if (!data.e || typeof data.e !== "string") return null;
    return { email: data.e.trim().toLowerCase() };
  } catch {
    return null;
  }
}
