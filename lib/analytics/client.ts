import type { VisitEvent } from "@/lib/analytics/classify";

const VISITOR_COOKIE = "hc_vid";
const SESSION_COOKIE = "hc_sid";
const LANDING_KEY = "hc_land";
const SESSION_MS = 30 * 60 * 1000;
const VISITOR_MAX_AGE = 365 * 24 * 60 * 60;

type Landing = {
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

let lastSentKey = "";
let lastSentAt = 0;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function visitorId(): string {
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) {
    writeCookie(VISITOR_COOKIE, existing, VISITOR_MAX_AGE);
    return existing;
  }
  const id = newId();
  writeCookie(VISITOR_COOKIE, id, VISITOR_MAX_AGE);
  return id;
}

function sessionId(): string {
  const existing = readCookie(SESSION_COOKIE);
  if (existing) {
    writeCookie(SESSION_COOKIE, existing, Math.ceil(SESSION_MS / 1000));
    return existing;
  }
  const id = newId();
  writeCookie(SESSION_COOKIE, id, Math.ceil(SESSION_MS / 1000));
  try {
    sessionStorage.removeItem(LANDING_KEY);
  } catch {
    /* private mode */
  }
  return id;
}

function utmFromSearch(search: string): Pick<Landing, "utm_source" | "utm_medium" | "utm_campaign"> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const pick = (key: string) => params.get(key)?.trim().slice(0, 80) || null;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
  };
}

function landingForSession(search: string): Landing {
  try {
    const stored = sessionStorage.getItem(LANDING_KEY);
    if (stored) return JSON.parse(stored) as Landing;
  } catch {
    /* ignore */
  }

  const utm = utmFromSearch(search);
  const landing: Landing = {
    referrer: document.referrer || null,
    ...utm,
  };

  try {
    sessionStorage.setItem(LANDING_KEY, JSON.stringify(landing));
  } catch {
    /* ignore */
  }
  return landing;
}

function post(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    void fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* never block the page */
  }
}

function send(event: VisitEvent, path: string, search = "") {
  if (typeof window === "undefined") return;
  const key = `${event}:${path}`;
  const now = Date.now();
  if (key === lastSentKey && now - lastSentAt < 1500) return;
  lastSentKey = key;
  lastSentAt = now;

  const landing = landingForSession(search);
  post({
    event,
    visitor_id: visitorId(),
    session_id: sessionId(),
    path,
    referrer: landing.referrer,
    utm_source: landing.utm_source,
    utm_medium: landing.utm_medium,
    utm_campaign: landing.utm_campaign,
  });
}

/** One pageview per public path change. */
export function trackSitePageview(pathname: string, search = "") {
  if (!pathname.startsWith("/bg") && !pathname.startsWith("/en")) return;
  send("pageview", pathname, search);
}

/** Lead form or newsletter signup that succeeded. */
export function trackSiteLead() {
  send("lead", window.location.pathname, window.location.search);
}

/** Visitor started a Stripe checkout from the site. */
export function trackSiteCheckout() {
  send("checkout", window.location.pathname, window.location.search);
}
