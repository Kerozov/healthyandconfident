import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getMetaPixelConfig, isCapiActive } from "@/lib/meta/config";
import {
  hashCountryCode,
  hashEmail,
  hashExternalId,
  hashName,
  hashPhone,
} from "@/lib/meta/hash";
import {
  META_GRAPH_VERSION,
  type MetaEventName,
  type MetaEventSource,
  type MetaEventStatus,
} from "@/lib/meta/types";

const REQUEST_TIMEOUT_MS = 8000;

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Our subscriber/contact id — improves match quality. */
  externalId?: string | null;
  country?: string | null;
  /** `_fbp` cookie set by the pixel. */
  fbp?: string | null;
  /** `_fbc` cookie, or built from the `fbclid` query parameter. */
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

export type MetaCustomData = {
  value?: number | null;
  currency?: string | null;
  contentIds?: string[];
  contentType?: "product" | "product_group";
  contentName?: string | null;
  contentCategory?: string | null;
  numItems?: number | null;
  orderId?: string | null;
};

export type MetaServerEvent = {
  eventName: MetaEventName;
  /** Must match the browser `fbq` event id so Meta deduplicates the pair. */
  eventId?: string | null;
  /** Unix seconds. Defaults to now. Meta rejects events older than 7 days. */
  eventTime?: number;
  eventSourceUrl?: string | null;
  actionSource?: "website" | "system_generated";
  /** Where the event originated — shown in the admin event log. */
  source?: MetaEventSource;
  user?: MetaUserData;
  custom?: MetaCustomData;
};

export type MetaSendResult = {
  ok: boolean;
  status: MetaEventStatus;
  error?: string;
  eventsReceived?: number;
};

function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out;
}

function buildUserData(user: MetaUserData | undefined): Record<string, unknown> {
  if (!user) return {};
  const email = hashEmail(user.email);
  const phone = hashPhone(user.phone);
  const first = hashName(user.firstName);
  const last = hashName(user.lastName);
  const country = hashCountryCode(user.country);
  const externalId = hashExternalId(user.externalId);

  return compact({
    em: email ? [email] : null,
    ph: phone ? [phone] : null,
    fn: first ? [first] : null,
    ln: last ? [last] : null,
    country: country ? [country] : null,
    external_id: externalId ? [externalId] : null,
    fbp: user.fbp ?? null,
    fbc: user.fbc ?? null,
    client_ip_address: user.clientIpAddress ?? null,
    client_user_agent: user.clientUserAgent ?? null,
  });
}

function buildCustomData(custom: MetaCustomData | undefined): Record<string, unknown> {
  if (!custom) return {};
  return compact({
    value: typeof custom.value === "number" ? Number(custom.value.toFixed(2)) : null,
    currency: custom.currency ? custom.currency.toUpperCase() : null,
    content_ids: custom.contentIds ?? null,
    content_type: custom.contentType ?? null,
    content_name: custom.contentName ?? null,
    content_category: custom.contentCategory ?? null,
    num_items: custom.numItems ?? null,
    order_id: custom.orderId ?? null,
  });
}

async function logEvent(input: {
  event: MetaServerEvent;
  status: MetaEventStatus;
  error?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("meta_event_log").insert({
      event_name: input.event.eventName,
      event_id: input.event.eventId ?? null,
      source: input.event.source ?? "server",
      email: input.event.user?.email?.trim().toLowerCase() || null,
      value_cents:
        typeof input.event.custom?.value === "number"
          ? Math.round(input.event.custom.value * 100)
          : null,
      currency: input.event.custom?.currency?.toUpperCase() ?? null,
      status: input.status,
      error: input.error ?? null,
      payload: input.payload,
    });
    // 23505 = the same event id was already logged (retry / duplicate webhook).
    if (error && error.code !== "23505") {
      console.warn("[meta] event log insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[meta] event log failed:", err instanceof Error ? err.message : err);
  }
}

/** Send one Conversions API event. Never throws — marketing must not break checkout. */
export async function sendMetaEvent(event: MetaServerEvent): Promise<MetaSendResult> {
  const config = await getMetaPixelConfig();

  if (!isCapiActive(config)) {
    return { ok: false, status: "skipped", error: "capi_disabled" };
  }
  if (event.eventName === "Purchase" && !config.track_purchase) {
    return { ok: false, status: "skipped", error: "purchase_tracking_off" };
  }
  if (event.eventName === "Lead" && !config.track_lead) {
    return { ok: false, status: "skipped", error: "lead_tracking_off" };
  }
  if (event.eventName === "InitiateCheckout" && !config.track_checkout) {
    return { ok: false, status: "skipped", error: "checkout_tracking_off" };
  }
  if (event.eventName === "ViewContent" && !config.track_view_content) {
    return { ok: false, status: "skipped", error: "view_content_tracking_off" };
  }
  if (event.eventName === "PageView" && !config.track_page_view) {
    return { ok: false, status: "skipped", error: "page_view_tracking_off" };
  }

  const userData = buildUserData(event.user);
  if (Object.keys(userData).length === 0) {
    // Meta rejects events with no identifiers at all.
    return { ok: false, status: "skipped", error: "no_user_identifiers" };
  }

  const payload = compact({
    event_name: event.eventName,
    event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: event.eventId ?? null,
    event_source_url: event.eventSourceUrl ?? null,
    action_source: event.actionSource ?? "website",
    user_data: userData,
    custom_data: buildCustomData(event.custom),
  });

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${config.pixel_id.trim()}/events`;

  let status: MetaEventStatus = "sent";
  let errorMessage: string | undefined;
  let eventsReceived: number | undefined;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        compact({
          data: [payload],
          test_event_code: config.test_event_code.trim() || null,
          access_token: config.access_token.trim(),
        }),
      ),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    const json = (await res.json().catch(() => null)) as {
      events_received?: number;
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      status = "failed";
      errorMessage =
        json?.error?.message ?? `Meta returned ${res.status} ${res.statusText}`;
    } else {
      eventsReceived = json?.events_received;
    }
  } catch (err) {
    status = "failed";
    errorMessage =
      err instanceof Error ? err.message : "Conversions API request failed";
  }

  if (config.log_events) {
    await logEvent({ event, status, error: errorMessage, payload });
  }

  if (status === "failed") {
    console.warn(`[meta] ${event.eventName} failed: ${errorMessage}`);
  }

  return { ok: status === "sent", status, error: errorMessage, eventsReceived };
}
