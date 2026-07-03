import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type FormInvitePayload = {
  f: string;
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

export function createFormInviteToken(payload: FormInvitePayload): string | null {
  const secret = signingSecret();
  if (!secret) return null;

  const normalized: FormInvitePayload = {
    f: payload.f,
    e: payload.e.trim().toLowerCase(),
    ...(payload.sid ? { sid: payload.sid } : {}),
  };
  const encoded = base64url(JSON.stringify(normalized));
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyFormInviteToken(token: string): FormInvitePayload | null {
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
    const data = JSON.parse(fromBase64url(encoded)) as FormInvitePayload;
    if (!data.f || !data.e) return null;
    return { f: data.f, e: data.e.trim().toLowerCase(), ...(data.sid ? { sid: data.sid } : {}) };
  } catch {
    return null;
  }
}
