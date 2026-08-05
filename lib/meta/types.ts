/** Meta Pixel / Conversions API shared types (safe to import on the client). */

/** Standard Meta events this site emits. */
export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Lead"
  | "CompleteRegistration"
  | "Subscribe"
  | "Purchase"
  | "Contact";

export type MetaEventSource = "browser" | "server";

export type MetaEventStatus = "sent" | "failed" | "skipped";

/** Row of `meta_pixel_config` — one row, key = 'default'. */
export type MetaPixelConfig = {
  key: string;
  enabled: boolean;
  pixel_id: string;
  access_token: string;
  test_event_code: string;
  capi_enabled: boolean;
  track_page_view: boolean;
  track_view_content: boolean;
  track_lead: boolean;
  track_checkout: boolean;
  track_purchase: boolean;
  log_events: boolean;
  /** Token for <meta name="facebook-domain-verification">, from Business Manager. */
  domain_verification: string;
  /** Comma separated extra pixel ids — every browser event fires to these too. */
  additional_pixel_ids: string;
  ad_account_id: string;
  catalog_id: string;
  notes: string;
  updated_at: string;
};

export type MetaEventLogRow = {
  id: string;
  event_name: string;
  event_id: string | null;
  source: MetaEventSource;
  email: string | null;
  value_cents: number | null;
  currency: string | null;
  status: MetaEventStatus;
  error: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

/** What the browser sends to `/api/meta/track` for server-side mirroring. */
export type MetaTrackRequest = {
  eventName: MetaEventName;
  /** Shared with the browser `fbq` call so Meta can deduplicate. */
  eventId: string;
  /** Page the event happened on. */
  eventSourceUrl?: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  contentType?: "product" | "product_group";
  contentCategory?: string;
  numItems?: number;
  /** Personal data — hashed server-side before it leaves the app. */
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

/** Client-visible pixel settings — never includes the access token. */
export type MetaPixelPublicConfig = {
  enabled: boolean;
  pixelId: string;
  /** Extra pixels that receive the exact same events. */
  extraPixelIds: string[];
  trackPageView: boolean;
  trackViewContent: boolean;
  trackLead: boolean;
  trackCheckout: boolean;
};

/** Splits the stored "123, 456" list into clean numeric pixel ids. */
export function parsePixelIdList(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter((id) => /^\d{6,25}$/.test(id));
}

export const META_GRAPH_VERSION = "v21.0";
