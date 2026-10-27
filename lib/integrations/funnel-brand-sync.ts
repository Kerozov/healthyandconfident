import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  fetchFunnelBrandPage,
  getFunnelBrandConfig,
  pingFunnelBrand,
  type FunnelBrandConfig,
  type FunnelBrandContact,
} from "@/lib/integrations/funnel-brand";
import { getSyncState, saveSyncState } from "@/lib/integrations/sync-state";
import { ensureSubscriberSegmentKeys, type SegmentSeed } from "@/lib/segments/ensure";
import type { Subscriber } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils";

/**
 * Pulls contacts from FunnelBrand into `subscribers`.
 *
 * Every contact arrives tagged twice — with the funnel it came from and with the
 * software that collected it — so a campaign can target „хората от тази фуния“
 * without guessing.
 *
 * Deliberately does *not* run automations. A sync can bring in hundreds of
 * contacts at once, and welcome flows firing on all of them would be a mail
 * blast nobody asked for. Use a campaign against the funnel's segment instead.
 */

export const FUNNEL_BRAND_INTEGRATION = "funnel-brand";

const PAGE_SIZE = 200;
/** Stops a runaway loop if the upstream ever reports `hasMore` forever. */
const MAX_PAGES = 50;

export type FunnelBrandSyncResult = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  /** Already present with nothing new to merge, or unsubscribed here. */
  skipped: number;
  segments: string[];
  cursor: string | null;
};

/**
 * Where one funnel's contacts land. Keyed by the funnel's own segment key, which
 * is what every contact carries as `segment`.
 *
 * - `same`: a segment named after the funnel (the default, and the old behaviour)
 * - `existing`: a segment that is already in the catalog
 * - `custom`: a new segment with a name the admin typed
 */
export type FunnelSegmentChoice =
  | { mode: "same" }
  | { mode: "existing"; key: string }
  | { mode: "custom"; name: string };

export type FunnelSegmentRouting = Record<string, FunnelSegmentChoice>;

export type FunnelBrandFunnelOption = {
  id: string;
  name: string;
  segment: string;
  contacts: number;
};

export type FunnelBrandSyncStatus = {
  configured: boolean;
  lastRunAt: string | null;
  lastCursor: string | null;
  lastCreated: number;
  lastUpdated: number;
  lastSkipped: number;
  lastError: string | null;
  /** The routing used on the last sync — the starting point for the next one. */
  routing: FunnelSegmentRouting;
};

function parseRouting(value: unknown): FunnelSegmentRouting {
  const raw = (value as { routing?: unknown } | null)?.routing;
  if (!raw || typeof raw !== "object") return {};

  const routing: FunnelSegmentRouting = {};
  for (const [segment, choice] of Object.entries(raw as Record<string, unknown>)) {
    const c = choice as { mode?: string; key?: unknown; name?: unknown } | null;
    if (c?.mode === "existing" && typeof c.key === "string" && c.key.trim()) {
      routing[segment] = { mode: "existing", key: c.key.trim() };
    } else if (c?.mode === "custom" && typeof c.name === "string" && c.name.trim()) {
      routing[segment] = { mode: "custom", name: c.name.trim() };
    } else if (c?.mode === "same") {
      routing[segment] = { mode: "same" };
    }
  }
  return routing;
}

export async function getFunnelBrandSyncStatus(): Promise<FunnelBrandSyncStatus> {
  const state = await getSyncState(FUNNEL_BRAND_INTEGRATION);
  return {
    configured: getFunnelBrandConfig() !== null,
    lastRunAt: state?.last_run_at ?? null,
    lastCursor: state?.last_cursor ?? null,
    lastCreated: state?.last_created ?? 0,
    lastUpdated: state?.last_updated ?? 0,
    lastSkipped: state?.last_skipped ?? 0,
    lastError: state?.last_error ?? null,
    routing: parseRouting(state?.settings),
  };
}

/** The funnels behind the key, for the segment picker shown before a sync. */
export async function listFunnelBrandFunnels(): Promise<
  { ok: true; funnels: FunnelBrandFunnelOption[] } | { ok: false; message: string }
> {
  const config = getFunnelBrandConfig();
  if (!config) {
    return { ok: false, message: "Липсва FUNNEL_BRAND_API_KEY в env на сайта." };
  }

  try {
    const ping = await pingFunnelBrand(config);
    return {
      ok: true,
      funnels: ping.funnels.map((f) => ({
        id: f.id,
        name: f.name,
        segment: f.segment,
        contacts: f.contacts,
      })),
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Връзката не успя." };
  }
}

export async function testFunnelBrandConnection(): Promise<
  { ok: true; message: string } | { ok: false; message: string }
> {
  const config = getFunnelBrandConfig();
  if (!config) {
    return { ok: false, message: "Липсва FUNNEL_BRAND_API_KEY в env на сайта." };
  }

  try {
    const ping = await pingFunnelBrand(config);
    const funnels = ping.funnels.map((f) => `${f.name} (${f.contacts})`).join(", ");
    return {
      ok: true,
      message: `Връзката работи. Достъп до ${ping.funnels.length} фуния(и): ${funnels || "-"}. Общо ${ping.totalContacts} контакта.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Връзката не успя." };
  }
}

/** Turns the admin's choice for one funnel into the segment key its contacts get. */
function resolveTarget(
  funnelSegment: string,
  funnelName: string,
  choice: FunnelSegmentChoice | undefined,
): { key: string; name: string } {
  if (choice?.mode === "existing") return { key: choice.key, name: choice.key };
  if (choice?.mode === "custom") {
    const key = slugify(choice.name);
    if (key && key !== "all") return { key, name: choice.name };
  }
  return { key: funnelSegment, name: funnelName || funnelSegment };
}

/** Segment keys must exist in the catalog, or the admin pickers cannot target them. */
async function ensureSegments(keys: string[], seeds: SegmentSeed[]): Promise<void> {
  try {
    await ensureSubscriberSegmentKeys(keys, seeds);
  } catch (err) {
    console.error("[funnel-brand-sync] segments:", err);
  }
}

type ExistingSubscriber = Pick<
  Subscriber,
  "id" | "tags" | "status" | "name" | "first_name" | "last_name" | "phone"
>;

/**
 * Merges one contact in. Never resurrects an unsubscribed person and never
 * blanks a field the site already knows — FunnelBrand is an extra source here,
 * not the owner of the record.
 */
async function upsertContact(
  contact: FunnelBrandContact,
  tags: string[],
): Promise<"created" | "updated" | "skipped"> {
  const supabase = getAdminClient();
  const email = contact.email.trim().toLowerCase();
  if (!email) return "skipped";

  const { data } = await supabase
    .from("subscribers")
    .select("id, tags, status, name, first_name, last_name, phone")
    .eq("email", email)
    .maybeSingle();

  const existing = (data as ExistingSubscriber | null) ?? null;

  if (existing?.status === "unsubscribed") {
    return "skipped";
  }

  if (!existing) {
    const { error } = await supabase.from("subscribers").insert({
      email,
      name: contact.name,
      first_name: contact.firstName,
      last_name: contact.lastName,
      phone: contact.phone,
      locale: "bg",
      source: contact.source,
      status: "subscribed",
      tags,
      consent: true,
    });

    if (error) throw new Error(`${email}: ${error.message}`);
    return "created";
  }

  const existingTags = existing.tags ?? [];
  const mergedTags = [...new Set([...existingTags, ...tags])];
  const tagsChanged =
    mergedTags.length !== existingTags.length ||
    mergedTags.some((tag) => !existingTags.includes(tag));

  const patch: Partial<Subscriber> = {};
  if (tagsChanged) patch.tags = mergedTags;
  if (!existing.name && contact.name) patch.name = contact.name;
  if (!existing.first_name && contact.firstName) patch.first_name = contact.firstName;
  if (!existing.last_name && contact.lastName) patch.last_name = contact.lastName;
  if (!existing.phone && contact.phone) patch.phone = contact.phone;

  if (Object.keys(patch).length === 0) return "skipped";

  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from("subscribers").update(patch).eq("id", existing.id);
  if (error) throw new Error(`${email}: ${error.message}`);

  if (tagsChanged) {
    try {
      const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
        "@/lib/automation/cancel"
      );
      await cancelIneligibleAutomationDeliveriesForSubscriber(email, mergedTags);
    } catch (err) {
      console.error("[funnel-brand-sync] cancel automations:", err);
    }
  }

  return "updated";
}

export async function syncFunnelBrandContacts(
  options: { full?: boolean; routing?: FunnelSegmentRouting } = {},
): Promise<FunnelBrandSyncResult> {
  const config = getFunnelBrandConfig();
  if (!config) {
    return {
      ok: false,
      message: "Липсва FUNNEL_BRAND_API_KEY. Добави ключа от FunnelBrand в env на сайта.",
      created: 0,
      updated: 0,
      skipped: 0,
      segments: [],
      cursor: null,
    };
  }

  const state = await getSyncState(FUNNEL_BRAND_INTEGRATION);
  const since = options.full ? null : (state?.last_cursor ?? null);
  // Comes from the browser — parsed the same way as the stored copy.
  const routing = options.routing
    ? parseRouting({ routing: options.routing })
    : parseRouting(state?.settings);

  if (options.routing) {
    // Saved on its own: if migration 081 is missing, the cursor must still be written.
    await saveSyncState(FUNNEL_BRAND_INTEGRATION, {
      settings: { ...(state?.settings ?? {}), routing },
    });
  }

  try {
    const outcome = await runSync(config, since, routing);
    await saveSyncState(FUNNEL_BRAND_INTEGRATION, {
      last_cursor: outcome.cursor ?? state?.last_cursor ?? null,
      last_run_at: new Date().toISOString(),
      last_created: outcome.created,
      last_updated: outcome.updated,
      last_skipped: outcome.skipped,
      last_error: null,
    });
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Синхронизацията не успя.";
    await saveSyncState(FUNNEL_BRAND_INTEGRATION, {
      last_run_at: new Date().toISOString(),
      last_error: message,
    });
    return {
      ok: false,
      message,
      created: 0,
      updated: 0,
      skipped: 0,
      segments: [],
      cursor: null,
    };
  }
}

async function runSync(
  config: FunnelBrandConfig,
  since: string | null,
  routing: FunnelSegmentRouting,
): Promise<FunnelBrandSyncResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let cursor: string | null = null;
  const segments = new Set<string>();
  const seeds = new Map<string, SegmentSeed>();
  const errors: string[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchFunnelBrandPage(config, {
      since,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });

    for (const contact of result.contacts) {
      if (contact.unsubscribed) {
        skipped += 1;
        continue;
      }
      const funnelSegment = contact.segment?.trim();
      const target = funnelSegment
        ? resolveTarget(funnelSegment, contact.segmentName, routing[funnelSegment])
        : null;

      // The funnel's own segment tag is swapped for the chosen one; the source tag stays.
      const tags = [
        ...new Set(
          contact.tags
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => (target && t === funnelSegment ? target.key : t)),
        ),
      ];
      if (target && !tags.includes(target.key)) tags.push(target.key);
      if (target && !seeds.has(target.key)) {
        seeds.set(target.key, { key: target.key, name: target.name });
      }
      tags.forEach((tag) => segments.add(tag));

      try {
        const outcome = await upsertContact(contact, tags);
        if (outcome === "created") created += 1;
        else if (outcome === "updated") updated += 1;
        else skipped += 1;
      } catch (err) {
        skipped += 1;
        if (errors.length < 5) {
          errors.push(err instanceof Error ? err.message : "неуспешен контакт");
        }
      }
    }

    if (result.nextSince) cursor = result.nextSince;
    if (!result.hasMore) break;
  }

  await ensureSegments([...segments], [...seeds.values()]);

  const touched = created + updated;
  const message =
    touched === 0 && skipped === 0
      ? "Няма нови контакти от FunnelBrand."
      : `Синхронизирани ${touched} контакта: ${created} нови, ${updated} обновени${
          skipped ? `, ${skipped} пропуснати` : ""
        }.${errors.length ? ` Грешки: ${errors.join("; ")}` : ""}`;

  return {
    ok: errors.length === 0,
    message,
    created,
    updated,
    skipped,
    segments: [...segments],
    cursor,
  };
}
