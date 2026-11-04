import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { ALL_HEALTH_TAG_KEYS } from "@/lib/site/health-tags";

/**
 * Tags the public signup forms put on a subscriber — `LeadForm` and the
 * free-menu popup. Anything else posted to /api/subscribe is dropped.
 *
 * The endpoint is unauthenticated, and tags drive "entered this segment"
 * automations. Accepting any tag let a stranger add a purchase tag
 * (e.g. `zakupili-rakovodstvo-…`) to their own address and be mailed a paid
 * guide for free.
 */
const STATIC_SIGNUP_TAGS = ["free-menu", "newsletter"] as const;

/** Sources only the server sets — never accepted from the browser. */
const RESERVED_SOURCES = new Set(["purchase", "manual", "import", "system", "funnel-brand"]);

export async function allowedSignupTags(): Promise<Set<string>> {
  const allowed = new Set<string>([...STATIC_SIGNUP_TAGS, ...ALL_HEALTH_TAG_KEYS]);

  // The popup's "save to segment" tag is chosen by an admin in /admin/popup.
  const { data, error } = await getAdminClient()
    .from("popup_config")
    .select("segment_tag");
  if (error) {
    console.error("[signup-tags] popup_config:", error.message);
  }
  for (const row of (data as { segment_tag: string | null }[] | null) ?? []) {
    const tag = row.segment_tag?.trim();
    if (tag && tag !== "all") allowed.add(tag);
  }

  return allowed;
}

/** A browser-supplied signup source, or `fallback` when it is reserved or malformed. */
export function sanitizeSignupSource(raw: unknown, fallback = "popup"): string {
  if (typeof raw !== "string") return fallback;
  const source = raw.trim().toLowerCase().slice(0, 60);
  if (!source || !/^[a-z0-9][a-z0-9_:-]*$/.test(source)) return fallback;
  if (RESERVED_SOURCES.has(source) || source.startsWith("form:")) return fallback;
  return source;
}
