import type { MetaEventName, MetaTrackRequest } from "@/lib/meta/types";

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: unknown;
    /** Set by <MetaPixel /> once `fbq('init')` has run. */
    __metaPixelReady?: boolean;
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

/** Shared between the browser pixel and the Conversions API so Meta deduplicates. */
export function metaEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
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

function currentFbclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get("fbclid");
  } catch {
    return null;
  }
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
 * API with the same event id. Returns the event id (no-op when the pixel is off).
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
  if (typeof window === "undefined" || !window.__metaPixelReady) return null;

  const eventId = options?.eventId ?? metaEventId();

  try {
    window.fbq?.("track", eventName, pixelParams(params), { eventID: eventId });
  } catch {
    // Ad blockers can replace fbq with a throwing stub.
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
