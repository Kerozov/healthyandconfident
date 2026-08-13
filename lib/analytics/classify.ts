/** Classify traffic and devices for first-party visit stats. */

export type VisitEvent = "pageview" | "lead" | "checkout";
export type VisitDevice = "mobile" | "tablet" | "desktop";
export type VisitSource =
  | "direct"
  | "facebook"
  | "instagram"
  | "google"
  | "email"
  | "youtube"
  | "other";

export const VISIT_SOURCE_LABELS: Record<VisitSource, string> = {
  direct: "Директно",
  facebook: "Facebook / Meta",
  instagram: "Instagram",
  google: "Google",
  email: "Имейл",
  youtube: "YouTube",
  other: "Друго",
};

export const VISIT_DEVICE_LABELS: Record<VisitDevice, string> = {
  mobile: "Телефон",
  tablet: "Таблет",
  desktop: "Компютър",
};

const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|duckduck|yandex|semrush|ahrefs|mj12|dotbot|petal|gptbot|claudebot|bytespider|amazonbot|pingdom|uptime|headless|preview/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return BOT_RE.test(ua);
}

export function classifyDevice(ua: string | null | undefined): VisitDevice {
  const s = (ua ?? "").toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android.+mobile|windows phone/.test(s)) return "mobile";
  return "desktop";
}

function hostFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = value.includes("://") ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const OWN_HOSTS = new Set([
  "healthyandconfident.co.uk",
  "www.healthyandconfident.co.uk",
  "localhost",
]);

export function classifySource(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrerHost?: string | null;
}): VisitSource {
  const utm = (input.utmSource ?? "").trim().toLowerCase();
  const medium = (input.utmMedium ?? "").trim().toLowerCase();
  const host = (input.referrerHost ?? "").trim().toLowerCase().replace(/^www\./, "");

  if (
    medium === "email" ||
    utm === "email" ||
    utm === "newsletter" ||
    host.endsWith("mail.google.com")
  ) {
    return "email";
  }

  if (
    utm === "facebook" ||
    utm === "fb" ||
    utm === "meta" ||
    host === "facebook.com" ||
    host === "fb.com" ||
    host === "m.facebook.com" ||
    host === "l.facebook.com" ||
    host === "lm.facebook.com" ||
    host.endsWith(".facebook.com")
  ) {
    return "facebook";
  }

  if (
    utm === "instagram" ||
    utm === "ig" ||
    host === "instagram.com" ||
    host === "l.instagram.com" ||
    host.endsWith(".instagram.com")
  ) {
    return "instagram";
  }

  if (
    utm === "google" ||
    utm === "googleads" ||
    (medium === "cpc" && utm.includes("google")) ||
    host === "google.com" ||
    host.endsWith(".google.com") ||
    host === "google.bg" ||
    host.endsWith(".google.bg")
  ) {
    return "google";
  }

  if (
    utm === "youtube" ||
    host === "youtube.com" ||
    host === "youtu.be" ||
    host.endsWith(".youtube.com")
  ) {
    return "youtube";
  }

  if (!host || OWN_HOSTS.has(host)) {
    if (utm) return "other";
    return "direct";
  }

  return "other";
}

/** Public site paths only — strips query/hash and rejects junk. */
export function sanitizeVisitPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  let path = trimmed.split("?")[0].split("#")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (path.length > 200) return null;
  if (!/^\/(bg|en)(\/.*)?$/.test(path)) return null;
  if (path.includes("..") || path.includes("//") || path.includes("\\")) return null;
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) < 32) return null;
  }
  return path.replace(/\/+$/, "") || path;
}

export function visitPathLabel(path: string): string {
  const clean = path.replace(/\/+$/, "") || "/";
  const locale = clean.startsWith("/en") ? "en" : "bg";
  const rest = clean.replace(/^\/(bg|en)/, "") || "/";

  if (rest === "/") return locale === "en" ? "Начало (EN)" : "Начало (BG)";
  if (rest === "/blog") return "Блог";
  if (rest.startsWith("/blog/")) return `Блог: ${decodeURIComponent(rest.slice(6))}`;
  if (rest.startsWith("/programs/")) {
    return `Програма: ${decodeURIComponent(rest.slice(10))}`;
  }
  if (rest.startsWith("/checkout/")) return "Страница за покупка";
  if (rest.startsWith("/forms/")) return `Форма: ${decodeURIComponent(rest.slice(7))}`;
  if (rest === "/unsubscribe") return "Отписване";
  return clean;
}

export function sanitizeHost(value: string | null | undefined): string | null {
  const host = hostFromUrl(value);
  if (!host) return null;
  if (OWN_HOSTS.has(host)) return null;
  return host.slice(0, 120);
}

export function sanitizeUtm(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase().slice(0, 80);
  if (!v) return null;
  if (!/^[\w.+\- %]+$/.test(v)) return null;
  return v;
}

export function isVisitId(value: string | null | undefined): boolean {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value);
}
