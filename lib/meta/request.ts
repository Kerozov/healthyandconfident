import "server-only";

import type { MetaUserData } from "@/lib/meta/capi";

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("=")) || null;
  }
  return null;
}

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip")?.trim() || null;
}

/** Meta's click id format when `_fbc` was never set (pixel blocked or first hit). */
export function fbcFromClickId(fbclid: string | null | undefined): string | null {
  const id = fbclid?.trim();
  if (!id) return null;
  return `fb.1.${Date.now()}.${id}`;
}

/**
 * Browser identifiers Meta uses for attribution — the pixel cookies plus the
 * IP/user-agent of the visitor making this request.
 */
export function metaUserFromRequest(req: Request): MetaUserData {
  return {
    fbp: readCookie(req, "_fbp"),
    fbc: readCookie(req, "_fbc"),
    clientIpAddress: clientIp(req),
    clientUserAgent: req.headers.get("user-agent"),
  };
}
