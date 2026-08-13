import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  classifyDevice,
  classifySource,
  isVisitId,
  sanitizeHost,
  sanitizeUtm,
  sanitizeVisitPath,
  type VisitEvent,
} from "@/lib/analytics/classify";

const EVENTS = new Set<VisitEvent>(["pageview", "lead", "checkout"]);

export type VisitInsertInput = {
  event?: unknown;
  visitor_id?: unknown;
  session_id?: unknown;
  path?: unknown;
  referrer?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
};

export async function recordSiteVisit(
  input: VisitInsertInput,
  ua: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const event = (
    typeof input.event === "string" ? input.event : "pageview"
  ) as VisitEvent;
  if (!EVENTS.has(event)) return { ok: false, error: "bad_event" };

  const visitorId = typeof input.visitor_id === "string" ? input.visitor_id : "";
  const sessionId = typeof input.session_id === "string" ? input.session_id : "";
  if (!isVisitId(visitorId) || !isVisitId(sessionId)) {
    return { ok: false, error: "bad_id" };
  }

  const path = sanitizeVisitPath(typeof input.path === "string" ? input.path : null);
  if (!path) return { ok: false, error: "bad_path" };

  const locale = path.startsWith("/en") ? "en" : "bg";
  const utmSource = sanitizeUtm(typeof input.utm_source === "string" ? input.utm_source : null);
  const utmMedium = sanitizeUtm(typeof input.utm_medium === "string" ? input.utm_medium : null);
  const utmCampaign = sanitizeUtm(
    typeof input.utm_campaign === "string" ? input.utm_campaign : null,
  );
  const referrerHost = sanitizeHost(typeof input.referrer === "string" ? input.referrer : null);

  const supabase = getAdminClient();
  const { error } = await supabase.from("site_visits").insert({
    event,
    visitor_id: visitorId,
    session_id: sessionId,
    path,
    locale,
    referrer_host: referrerHost,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    source: classifySource({
      utmSource,
      utmMedium,
      referrerHost,
    }),
    device: classifyDevice(ua),
  });

  if (error) {
    console.error("[analytics] insert failed:", error.message);
    return { ok: false, error: "db" };
  }
  return { ok: true };
}
