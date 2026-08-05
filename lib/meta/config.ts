import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  parsePixelIdList,
  type MetaPixelConfig,
  type MetaPixelPublicConfig,
} from "@/lib/meta/types";

const CACHE_MS = 60_000;

let cache: { at: number; config: MetaPixelConfig } | null = null;

function envPixelId(): string {
  return (
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
    process.env.META_PIXEL_ID?.trim() ||
    ""
  );
}

function envAccessToken(): string {
  return process.env.META_CONVERSIONS_API_TOKEN?.trim() || "";
}

function envTestEventCode(): string {
  return process.env.META_TEST_EVENT_CODE?.trim() || "";
}

function envDomainVerification(): string {
  return process.env.META_DOMAIN_VERIFICATION?.trim() || "";
}

function fallbackConfig(): MetaPixelConfig {
  return {
    key: "default",
    enabled: true,
    pixel_id: envPixelId(),
    access_token: envAccessToken(),
    test_event_code: envTestEventCode(),
    capi_enabled: true,
    track_page_view: true,
    track_view_content: true,
    track_lead: true,
    track_checkout: true,
    track_purchase: true,
    log_events: true,
    domain_verification: envDomainVerification(),
    additional_pixel_ids: "",
    ad_account_id: "",
    catalog_id: "",
    notes: "",
    updated_at: new Date(0).toISOString(),
  };
}

/**
 * Admin settings win; env vars fill in anything left blank so the pixel can be
 * configured without touching the database. Nothing fires without a pixel id.
 */
function mergeWithEnv(row: MetaPixelConfig): MetaPixelConfig {
  return {
    ...row,
    pixel_id: row.pixel_id?.trim() || envPixelId(),
    access_token: row.access_token?.trim() || envAccessToken(),
    test_event_code: row.test_event_code?.trim() || envTestEventCode(),
    domain_verification: row.domain_verification?.trim() || envDomainVerification(),
    additional_pixel_ids: row.additional_pixel_ids ?? "",
    ad_account_id: row.ad_account_id ?? "",
    catalog_id: row.catalog_id ?? "",
    notes: row.notes ?? "",
  };
}

export async function getMetaPixelConfig(): Promise<MetaPixelConfig> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.config;

  try {
    const supabase = getAdminClient();
    const { data } = await supabase
      .from("meta_pixel_config")
      .select("*")
      .eq("key", "default")
      .maybeSingle();

    const config = data
      ? mergeWithEnv(data as MetaPixelConfig)
      : fallbackConfig();
    cache = { at: Date.now(), config };
    return config;
  } catch (err) {
    console.warn(
      "[meta] config load failed, using env fallback:",
      err instanceof Error ? err.message : err,
    );
    return fallbackConfig();
  }
}

export function invalidateMetaPixelCache(): void {
  cache = null;
}

/** True when the browser pixel should render. */
export function isPixelActive(config: MetaPixelConfig): boolean {
  return config.enabled && Boolean(config.pixel_id.trim());
}

/** True when server-side Conversions API calls should be made. */
export function isCapiActive(config: MetaPixelConfig): boolean {
  return (
    isPixelActive(config) &&
    config.capi_enabled &&
    Boolean(config.access_token.trim())
  );
}

/** The verification token belongs in <head> — empty means nothing is rendered. */
export function metaDomainVerification(config: MetaPixelConfig): string {
  return config.domain_verification?.trim() ?? "";
}

/** Strips the access token — safe to pass into client components. */
export function toPublicConfig(config: MetaPixelConfig): MetaPixelPublicConfig {
  const active = isPixelActive(config);
  return {
    enabled: active,
    pixelId: active ? config.pixel_id.trim() : "",
    extraPixelIds: active
      ? parsePixelIdList(config.additional_pixel_ids ?? "").filter(
          (id) => id !== config.pixel_id.trim(),
        )
      : [],
    trackPageView: config.track_page_view,
    trackViewContent: config.track_view_content,
    trackLead: config.track_lead,
    trackCheckout: config.track_checkout,
  };
}

export async function getMetaPixelPublicConfig(): Promise<MetaPixelPublicConfig> {
  return toPublicConfig(await getMetaPixelConfig());
}
