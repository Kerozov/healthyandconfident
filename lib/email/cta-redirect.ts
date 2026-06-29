import { siteConfig } from "@/lib/site";

/** Public site origin used in email CTA redirect links. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteConfig.domain).replace(
    /\/$/,
    "",
  );
}

export function campaignCtaRedirectUrl(campaignId: string): string {
  return `${siteOrigin()}/api/go/campaign/${campaignId}`;
}

export function automationCtaRedirectUrl(
  automationId: string,
  locale: "bg" | "en",
): string {
  return `${siteOrigin()}/api/go/automation/${automationId}?locale=${locale}`;
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
