import "server-only";

import { createHash } from "node:crypto";

/**
 * Meta requires SHA-256 of normalized values for all personal data.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */
function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeBasic(value: string): string {
  return value.trim().toLowerCase();
}

export function hashEmail(email: string | null | undefined): string | null {
  const normalized = normalizeBasic(email ?? "");
  if (!normalized || !normalized.includes("@")) return null;
  return sha256(normalized);
}

/** Digits only. Local BG numbers get country code 359 so Meta can match. */
export function hashPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // 08XXXXXXXX → 3598XXXXXXXX ; 8XXXXXXXX (already stripped) → same.
  if (digits.length === 10 && digits.startsWith("0")) {
    digits = `359${digits.slice(1)}`;
  } else if (digits.length === 9 && /^[89]/.test(digits)) {
    digits = `359${digits}`;
  }
  if (digits.length < 7 || digits.length > 15) return null;
  return sha256(digits);
}

/** Names: lowercase, no punctuation or whitespace. */
export function hashName(name: string | null | undefined): string | null {
  const normalized = normalizeBasic(name ?? "").replace(/[^\p{L}\p{N}]/gu, "");
  if (!normalized) return null;
  return sha256(normalized);
}

export function hashCountryCode(code: string | null | undefined): string | null {
  const normalized = normalizeBasic(code ?? "");
  if (normalized.length !== 2) return null;
  return sha256(normalized);
}

/** External ID (our subscriber/contact id) is hashed like any other identifier. */
export function hashExternalId(id: string | null | undefined): string | null {
  const normalized = normalizeBasic(id ?? "");
  if (!normalized) return null;
  return sha256(normalized);
}

export function splitFullName(
  full: string | null | undefined,
): { first: string | null; last: string | null } {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts[parts.length - 1] };
}
