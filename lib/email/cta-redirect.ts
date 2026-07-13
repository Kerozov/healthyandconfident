import { publicSiteOrigin } from "@/lib/site";
import { createClickToken } from "@/lib/email/click-token";

/** Public site origin used in email CTA redirect links. */
export function siteOrigin(): string {
  return publicSiteOrigin();
}

function appendClickToken(baseUrl: string, token: string | null): string {
  if (!token) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}t=${encodeURIComponent(token)}`;
}

export function campaignCtaRedirectUrl(
  campaignId: string,
  email: string,
  subscriberId?: string | null,
): string {
  const base = `${siteOrigin()}/api/go/campaign/${campaignId}`;
  const token = createClickToken({
    s: "campaign",
    i: campaignId,
    e: email,
    sid: subscriberId ?? undefined,
  });
  return appendClickToken(base, token);
}

export function automationCtaRedirectUrl(
  automationId: string,
  locale: "bg" | "en",
  email: string,
  subscriberId?: string | null,
): string {
  const base = `${siteOrigin()}/api/go/automation/${automationId}?locale=${locale}`;
  const token = createClickToken({
    s: "automation",
    i: automationId,
    e: email,
    sid: subscriberId ?? undefined,
  });
  return appendClickToken(base, token);
}

/** Turn stored CTA targets (absolute or site-relative) into a redirect URL. */
export function resolveCtaTarget(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${siteOrigin()}${trimmed}`;
  }
  return trimmed;
}

export function isSafeCtaTarget(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return false;
}
