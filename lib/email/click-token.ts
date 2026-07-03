import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type ClickSourceType = "campaign" | "automation";

export type ClickTokenPayload = {
  s: ClickSourceType;
  i: string;
  e: string;
  sid?: string;
};

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

export function createClickToken(payload: ClickTokenPayload): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const normalized: ClickTokenPayload = {
    s: payload.s,
    i: payload.i,
    e: payload.e.trim().toLowerCase(),
    ...(payload.sid ? { sid: payload.sid } : {}),
  };
  const encoded = base64url(JSON.stringify(normalized));
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyClickToken(token: string): ClickTokenPayload | null {
  const secret = signingSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");

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
    const data = JSON.parse(fromBase64url(encoded)) as ClickTokenPayload;
    if (
      (data.s !== "campaign" && data.s !== "automation") ||
      !data.i ||
      !data.e
    ) {
      return null;
    }
    return {
      s: data.s,
      i: data.i,
      e: data.e.trim().toLowerCase(),
      ...(data.sid ? { sid: data.sid } : {}),
    };
  } catch {
    return null;
  }
}
