import type { MetaEventName, MetaTrackRequest } from "@/lib/meta/types";

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: unknown;
    /** Set by <MetaPixel /> once `fbq('init')` has run. */
    __metaPixelReady?: boolean;
    /** Which standard events the admin enabled — missing means fire everything. */
    __metaTrackFlags?: {
      viewContent: boolean;
      lead: boolean;
      checkout: boolean;
    };
  }
}

export type MetaTrackParams = {
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentType?: "product" | "product_group";
  contentCategory?: string;
  numItems?: number;
};

export type MetaTrackIdentity = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

export type MetaBrowserIds = {
  fbp: string | null;
  fbc: string | null;
  fbclid: string | null;
};

/** Shared between the browser pixel and the Conversions API so Meta deduplicates. */
export function metaEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("=")) || null;
      } catch {
        return rest.join("=") || null;
      }
    }
  }
  return null;
}

function currentFbclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("fbclid");
  } catch {
    return null;
  }
}

/**
 * Pixel cookies + the click id from the URL. Sent with checkout so Purchase
 * can still be attributed when the Facebook script is blocked.
 */
export function metaBrowserIds(): MetaBrowserIds {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    fbclid: currentFbclid(),
  };
}

/**
 * Keep `fbclid` as a first-party `_fbc` cookie for 90 days. Without this, a
 * click from Ads that lands with `?fbclid=` loses attribution as soon as the
 * visitor navigates — and never gets a cookie at all if the pixel is blocked.
 */
export function persistMetaClickId(): void {
  if (typeof document === "undefined") return;
  const fbclid = currentFbclid();
  if (!fbclid) return;
  const existing = readCookie("_fbc");
  if (existing && existing.endsWith(`.${fbclid}`)) return;

  const fbc = `fb.1.${Date.now()}.${fbclid}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `_fbc=${encodeURIComponent(fbc)}; Path=/; Max-Age=${90 * 24 * 60 * 60}; SameSite=Lax${secure}`;
}

function pixelParams(params: MetaTrackParams | undefined): Record<string, unknown> {
  if (!params) return {};
  const out: Record<string, unknown> = {};
  if (typeof params.value === "number") out.value = params.value;
  if (params.currency) out.currency = params.currency.toUpperCase();
  if (params.contentIds?.length) out.content_ids = params.contentIds;
  if (params.contentName) out.content_name = params.contentName;
  if (params.contentType) out.content_type = params.contentType;
  if (params.contentCategory) out.content_category = params.contentCategory;
  if (typeof params.numItems === "number") out.num_items = params.numItems;
  return out;
}

function eventAllowed(eventName: MetaEventName): boolean {
  const flags = typeof window !== "undefined" ? window.__metaTrackFlags : undefined;
  if (!flags) return true;
  if (eventName === "ViewContent") return flags.viewContent;
  if (
    eventName === "Lead" ||
    eventName === "CompleteRegistration" ||
    eventName === "Subscribe"
  ) {
    return flags.lead;
  }
  if (eventName === "InitiateCheckout" || eventName === "AddToCart") {
    return flags.checkout;
  }
  return true;
}

/** Mirror the event to our server so it reaches Meta even if the pixel is blocked. */
function mirrorToServer(body: MetaTrackRequest & { fbclid?: string | null }): void {
  try {
    void fetch("/api/meta/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the page.
  }
}

/**
 * Fire a standard Meta event in the browser and mirror it to the Conversions
 * API with the same event id. CAPI still fires when the pixel script is blocked.
 */
export function trackMeta(
  eventName: MetaEventName,
  params?: MetaTrackParams,
  identity?: MetaTrackIdentity,
  options?: {
    /** `false` when the server sends the Conversions API half itself. */
    mirror?: boolean;
    /** Supply when the server needs the same id to deduplicate. */
    eventId?: string;
  },
): string | null {
  if (typeof window === "undefined") return null;
  if (!eventAllowed(eventName)) return null;

  const eventId = options?.eventId ?? metaEventId();

  if (window.__metaPixelReady) {
    try {
      window.fbq?.("track", eventName, pixelParams(params), { eventID: eventId });
    } catch {
      // Ad blockers can replace fbq with a throwing stub.
    }
  }

  if (options?.mirror !== false) {
    mirrorToServer({
      eventName,
      eventId,
      eventSourceUrl: window.location.href,
      value: params?.value,
      currency: params?.currency,
      contentIds: params?.contentIds,
      contentName: params?.contentName,
      contentType: params?.contentType,
      contentCategory: params?.contentCategory,
      numItems: params?.numItems,
      email: identity?.email ?? null,
      phone: identity?.phone ?? null,
      firstName: identity?.firstName ?? null,
      lastName: identity?.lastName ?? null,
      fbclid: currentFbclid(),
    });
  }

  return eventId;
}

/** PageView stays browser-only — the pixel already handles it on every route. */
export function trackMetaPageView(): void {
  if (typeof window === "undefined" || !window.__metaPixelReady) return;
  try {
    window.fbq?.("track", "PageView");
  } catch {
    // ignore
  }
}
