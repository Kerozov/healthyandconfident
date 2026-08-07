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
import type { Subscriber } from "@/lib/supabase/types";

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

export type FunnelBrandSyncStatus = {
  configured: boolean;
  lastRunAt: string | null;
  lastCursor: string | null;
  lastCreated: number;
  lastUpdated: number;
  lastSkipped: number;
  lastError: string | null;
};

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
  };
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
      message: `Връзката работи. Достъп до ${ping.funnels.length} фуния(и): ${funnels || "—"}. Общо ${ping.totalContacts} контакта.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Връзката не успя." };
  }
}

/** Segment keys must exist in the catalog, or the admin pickers cannot target them. */
async function ensureSegments(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.map((k) => k.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const supabase = getAdminClient();
  const { data } = await supabase.from("segments").select("key").in("key", unique);
  const existing = new Set(((data as { key: string }[] | null) ?? []).map((s) => s.key));

  const missing = unique.filter((key) => !existing.has(key));
  if (missing.length === 0) return;

  const { error } = await supabase.from("segments").insert(
    missing.map((key) => ({
      key,
      name: key,
      description: "Автоматично създаден при синхронизация с FunnelBrand.",
    })),
  );

  if (error) console.error("[funnel-brand-sync] segments:", error.message);
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
): Promise<"created" | "updated" | "skipped"> {
  const supabase = getAdminClient();
  const email = contact.email.trim().toLowerCase();
  if (!email) return "skipped";

  const tags = [...new Set(contact.tags.map((t) => t.trim()).filter(Boolean))];

  const { data } = await supabase
    .from("subscribers")
    .select("id, tags, status, name, first_name, last_name, phone")
    .eq("email", email)
    .maybeSingle();

  const existing = (data as ExistingSubscriber | null) ?? null;

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

  const mergedTags = [...new Set([...(existing.tags ?? []), ...tags])];
  const tagsChanged = mergedTags.length !== (existing.tags ?? []).length;

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

  return "updated";
}

export async function syncFunnelBrandContacts(
  options: { full?: boolean } = {},
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

  try {
    const outcome = await runSync(config, since);
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
): Promise<FunnelBrandSyncResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let cursor: string | null = null;
  const segments = new Set<string>();
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
      contact.tags.forEach((tag) => segments.add(tag));

      try {
        const outcome = await upsertContact(contact);
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

  await ensureSegments([...segments]);

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
