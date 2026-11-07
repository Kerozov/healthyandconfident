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
import { recordSubscriberHistory } from "@/lib/admin/contact-statuses";
import type { Subscriber } from "@/lib/supabase/types";
import { chunkArray, slugify } from "@/lib/utils";

/**
 * Pulls contacts from FunnelBrand (now Launchify) into `subscribers`.
 *
 * Every contact arrives tagged with the funnel (webinar) it came from and with
 * the software that collected it. The admin decides, per webinar, which group
 * those people land in, and what happens to every other tag Launchify sends:
 * kept, renamed, joined to an existing group or dropped.
 *
 * Deliberately does *not* run automations. A sync can bring in hundreds of
 * contacts at once, and welcome flows firing on all of them would be a mail
 * blast nobody asked for. Use a campaign against the group instead.
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
  /** Already present with nothing new to merge, unsubscribed here, or a webinar turned off. */
  skipped: number;
  segments: string[];
  cursor: string | null;
};

/**
 * Where one webinar's contacts land. Keyed by the funnel's own segment key,
 * which is what every contact carries as `segment`.
 *
 * - `same`: a group named after the webinar (the default)
 * - `existing`: a group that is already in the catalog
 * - `custom`: a new group with a name the admin typed
 */
export type FunnelSegmentChoice =
  | { mode: "same" }
  | { mode: "existing"; key: string }
  | { mode: "custom"; name: string };

export type FunnelSegmentRouting = Record<string, FunnelSegmentChoice>;

/** What happens to a tag Launchify sends that is not the webinar's own group. */
export type FunnelTagChoice =
  | { mode: "keep" }
  | { mode: "existing"; key: string }
  | { mode: "custom"; name: string }
  | { mode: "skip" };

export type FunnelBrandSyncSettings = {
  routing: FunnelSegmentRouting;
  /** Webinars whose contacts are not pulled at all (their segment keys). */
  disabledFunnels: string[];
  /** For a webinar with no saved choice — e.g. one created after the last sync. */
  defaultChoice: { mode: "same" } | { mode: "existing"; key: string };
  /** Segment (segment_groups.id) that groups created by the sync are filed under. */
  newGroupParentId: string | null;
  /** Every synced contact also gets this group, e.g. „Всички от Launchify“. */
  alsoAddKey: string | null;
  tagMap: Record<string, FunnelTagChoice>;
};

export const DEFAULT_SYNC_SETTINGS: FunnelBrandSyncSettings = {
  routing: {},
  disabledFunnels: [],
  defaultChoice: { mode: "same" },
  newGroupParentId: null,
  alsoAddKey: null,
  tagMap: {},
};

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
  /** Saved choices — the starting point for the next sync. */
  settings: FunnelBrandSyncSettings;
};

function cleanKey(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseSegmentChoice(value: unknown): FunnelSegmentChoice | null {
  const c = value as { mode?: string; key?: unknown; name?: unknown } | null;
  if (c?.mode === "existing" && cleanKey(c.key)) return { mode: "existing", key: cleanKey(c.key)! };
  if (c?.mode === "custom" && cleanKey(c.name)) return { mode: "custom", name: cleanKey(c.name)! };
  if (c?.mode === "same") return { mode: "same" };
  return null;
}

function parseTagChoice(value: unknown): FunnelTagChoice | null {
  const c = value as { mode?: string; key?: unknown; name?: unknown } | null;
  if (c?.mode === "existing" && cleanKey(c.key)) return { mode: "existing", key: cleanKey(c.key)! };
  if (c?.mode === "custom" && cleanKey(c.name)) return { mode: "custom", name: cleanKey(c.name)! };
  if (c?.mode === "skip") return { mode: "skip" };
  if (c?.mode === "keep") return { mode: "keep" };
  return null;
}

/** Reads the stored (or browser-sent) settings; anything malformed falls back to defaults. */
export function parseSyncSettings(value: unknown): FunnelBrandSyncSettings {
  const raw = (value ?? {}) as Record<string, unknown>;

  const routing: FunnelSegmentRouting = {};
  if (raw.routing && typeof raw.routing === "object") {
    for (const [segment, choice] of Object.entries(raw.routing as Record<string, unknown>)) {
      const parsed = parseSegmentChoice(choice);
      if (parsed) routing[segment] = parsed;
    }
  }

  const tagMap: Record<string, FunnelTagChoice> = {};
  if (raw.tagMap && typeof raw.tagMap === "object") {
    for (const [tag, choice] of Object.entries(raw.tagMap as Record<string, unknown>)) {
      const parsed = parseTagChoice(choice);
      if (parsed) tagMap[tag] = parsed;
    }
  }

  const defaultParsed = parseSegmentChoice(raw.defaultChoice);
  const defaultChoice: FunnelBrandSyncSettings["defaultChoice"] =
    defaultParsed?.mode === "existing" ? defaultParsed : { mode: "same" };

  return {
    routing,
    tagMap,
    defaultChoice,
    disabledFunnels: Array.isArray(raw.disabledFunnels)
      ? [...new Set(raw.disabledFunnels.map(cleanKey).filter((k): k is string => Boolean(k)))]
      : [],
    newGroupParentId: cleanKey(raw.newGroupParentId),
    alsoAddKey: cleanKey(raw.alsoAddKey),
  };
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
    settings: parseSyncSettings(state?.settings),
  };
}

export async function saveFunnelBrandSettings(
  settings: FunnelBrandSyncSettings,
): Promise<FunnelBrandSyncSettings> {
  const state = await getSyncState(FUNNEL_BRAND_INTEGRATION);
  const parsed = parseSyncSettings(settings);
  await saveSyncState(FUNNEL_BRAND_INTEGRATION, {
    settings: { ...(state?.settings ?? {}), ...parsed },
  });
  return parsed;
}

/** The funnels behind the key. */
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
      message: `Връзката работи. Достъп до ${ping.funnels.length} уебинар(а): ${funnels || "-"}. Общо ${ping.totalContacts} контакта.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Връзката не успя." };
  }
}

// ── Preview: what the next sync would bring ─────────────────

export type FunnelBrandPreviewFunnel = FunnelBrandFunnelOption & {
  /** Contacts this sync would read for the webinar. */
  incoming: number;
  /** Of those, people not in the list yet. */
  newPeople: number;
};

export type FunnelBrandPreviewTag = {
  tag: string;
  count: number;
};

export type FunnelBrandPreview = {
  full: boolean;
  since: string | null;
  funnels: FunnelBrandPreviewFunnel[];
  /** Tags other than the webinars' own groups (e.g. the software tag). */
  otherTags: FunnelBrandPreviewTag[];
  totalIncoming: number;
  totalNew: number;
};

async function readAllPages(
  config: FunnelBrandConfig,
  since: string | null,
): Promise<{ contacts: FunnelBrandContact[]; funnelNames: Map<string, string>; cursor: string | null }> {
  const contacts: FunnelBrandContact[] = [];
  const funnelNames = new Map<string, string>();
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchFunnelBrandPage(config, {
      since,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    contacts.push(...result.contacts);
    for (const f of result.funnels ?? []) {
      if (f.segment && f.name) funnelNames.set(f.segment, f.name);
    }
    if (result.nextSince) cursor = result.nextSince;
    if (!result.hasMore) break;
  }
  return { contacts, funnelNames, cursor };
}

async function existingEmails(emails: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const supabase = getAdminClient();
  for (const batch of chunkArray([...new Set(emails)], 200)) {
    const { data } = await supabase.from("subscribers").select("email").in("email", batch);
    for (const row of (data as { email: string }[] | null) ?? []) {
      found.add(row.email.toLowerCase());
    }
  }
  return found;
}

export async function previewFunnelBrandSync(options: { full?: boolean } = {}): Promise<
  { ok: true; preview: FunnelBrandPreview } | { ok: false; message: string }
> {
  const config = getFunnelBrandConfig();
  if (!config) {
    return { ok: false, message: "Липсва FUNNEL_BRAND_API_KEY в env на сайта." };
  }

  try {
    const state = await getSyncState(FUNNEL_BRAND_INTEGRATION);
    const since = options.full ? null : (state?.last_cursor ?? null);
    const [ping, pages] = await Promise.all([
      pingFunnelBrand(config),
      readAllPages(config, since),
    ]);

    const live = pages.contacts.filter((c) => !c.unsubscribed && c.email?.trim());
    const known = await existingEmails(live.map((c) => c.email.trim().toLowerCase()));

    const funnelSegments = new Set(ping.funnels.map((f) => f.segment));
    const incoming = new Map<string, { incoming: number; newPeople: number }>();
    const tagCounts = new Map<string, number>();

    for (const contact of live) {
      const segment = contact.segment?.trim() ?? "";
      const bucket = incoming.get(segment) ?? { incoming: 0, newPeople: 0 };
      bucket.incoming += 1;
      if (!known.has(contact.email.trim().toLowerCase())) bucket.newPeople += 1;
      incoming.set(segment, bucket);

      for (const raw of contact.tags) {
        const tag = raw.trim();
        if (!tag || tag === segment || funnelSegments.has(tag)) continue;
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const funnels: FunnelBrandPreviewFunnel[] = ping.funnels.map((f) => ({
      id: f.id,
      name: f.name,
      segment: f.segment,
      contacts: f.contacts,
      incoming: incoming.get(f.segment)?.incoming ?? 0,
      newPeople: incoming.get(f.segment)?.newPeople ?? 0,
    }));

    // A contact whose webinar is no longer behind the key still has to show up.
    for (const [segment, bucket] of incoming) {
      if (!segment || funnelSegments.has(segment)) continue;
      funnels.push({
        id: `segment:${segment}`,
        name: pages.funnelNames.get(segment) ?? segment,
        segment,
        contacts: bucket.incoming,
        ...bucket,
      });
    }

    return {
      ok: true,
      preview: {
        full: Boolean(options.full),
        since,
        funnels,
        otherTags: [...tagCounts.entries()]
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count),
        totalIncoming: live.length,
        totalNew: live.filter((c) => !known.has(c.email.trim().toLowerCase())).length,
      },
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Връзката не успя." };
  }
}

// ── The sync ────────────────────────────────────────────────

/** Turns the admin's choice for one webinar into the group its contacts get. */
function resolveFunnelTarget(
  funnelSegment: string,
  funnelName: string,
  settings: FunnelBrandSyncSettings,
): SegmentSeed {
  const choice = settings.routing[funnelSegment] ?? settings.defaultChoice;
  const groupId = settings.newGroupParentId;
  if (choice.mode === "existing") return { key: choice.key, name: choice.key };
  if (choice.mode === "custom") {
    const key = slugify(choice.name);
    if (key && key !== "all") return { key, name: choice.name, groupId };
  }
  return { key: funnelSegment, name: funnelName || funnelSegment, groupId };
}

/** Same for any other tag; `null` drops it. */
function resolveTagTarget(
  tag: string,
  settings: FunnelBrandSyncSettings,
): SegmentSeed | null {
  const choice = settings.tagMap[tag];
  if (choice?.mode === "skip") return null;
  if (choice?.mode === "existing") return { key: choice.key, name: choice.key };
  if (choice?.mode === "custom") {
    const key = slugify(choice.name);
    if (key && key !== "all") return { key, name: choice.name, groupId: settings.newGroupParentId };
  }
  return { key: tag, name: tag };
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

type UpsertOutcome =
  | { kind: "created"; id: string | null; added: string[] }
  | { kind: "updated"; id: string; added: string[] }
  /** `id` is set when the person is here and still subscribed — their answers are kept. */
  | { kind: "skipped"; id?: string };

/**
 * Merges one contact in. Never resurrects an unsubscribed person and never
 * blanks a field the site already knows — Launchify is an extra source here,
 * not the owner of the record.
 */
async function upsertContact(
  contact: FunnelBrandContact,
  tags: string[],
): Promise<UpsertOutcome> {
  const supabase = getAdminClient();
  const email = contact.email.trim().toLowerCase();
  if (!email) return { kind: "skipped" };

  const { data } = await supabase
    .from("subscribers")
    .select("id, tags, status, name, first_name, last_name, phone")
    .eq("email", email)
    .maybeSingle();

  const existing = (data as ExistingSubscriber | null) ?? null;

  if (existing?.status === "unsubscribed") {
    return { kind: "skipped" };
  }

  if (!existing) {
    const { data: inserted, error } = await supabase
      .from("subscribers")
      .insert({
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
      })
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`${email}: ${error.message}`);
    return {
      kind: "created",
      id: (inserted as { id: string } | null)?.id ?? null,
      added: tags,
    };
  }

  const existingTags = existing.tags ?? [];
  const mergedTags = [...new Set([...existingTags, ...tags])];
  const added = mergedTags.filter((tag) => !existingTags.includes(tag));

  const patch: Partial<Subscriber> = {};
  if (added.length > 0) patch.tags = mergedTags;
  if (!existing.name && contact.name) patch.name = contact.name;
  if (!existing.first_name && contact.firstName) patch.first_name = contact.firstName;
  if (!existing.last_name && contact.lastName) patch.last_name = contact.lastName;
  if (!existing.phone && contact.phone) patch.phone = contact.phone;

  if (Object.keys(patch).length === 0) return { kind: "skipped", id: existing.id };

  patch.updated_at = new Date().toISOString();
  const { error } = await supabase.from("subscribers").update(patch).eq("id", existing.id);
  if (error) throw new Error(`${email}: ${error.message}`);

  if (added.length > 0) {
    try {
      const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
        "@/lib/automation/cancel"
      );
      await cancelIneligibleAutomationDeliveriesForSubscriber(email, mergedTags);
    } catch (err) {
      console.error("[funnel-brand-sync] cancel automations:", err);
    }
  }

  return { kind: "updated", id: existing.id, added };
}

const TICKET_LABELS: Record<string, string> = { free: "Безплатен", vip: "VIP" };

/** What Launchify knows about the person beyond name and email — kept per webinar. */
function launchifyFacts(contact: FunnelBrandContact): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  for (const [label, raw] of Object.entries(contact.formAnswers ?? {})) {
    const value = (Array.isArray(raw) ? raw.join(", ") : String(raw ?? "")).trim();
    if (label.trim() && value) facts.push({ label: label.trim().slice(0, 300), value: value.slice(0, 4000) });
  }
  if (contact.message?.trim()) facts.push({ label: "Съобщение", value: contact.message.trim().slice(0, 4000) });
  if (contact.ticket) facts.push({ label: "Билет", value: TICKET_LABELS[contact.ticket] ?? contact.ticket });
  if (contact.phone?.trim()) facts.push({ label: "Телефон", value: contact.phone.trim() });
  return facts;
}

/** Best effort: before migration 091 the table is missing and the answers are skipped. */
async function saveFacts(
  rows: {
    subscriber_id: string;
    source: string;
    source_label: string;
    label: string;
    value: string;
    updated_at: string;
  }[],
): Promise<void> {
  if (rows.length === 0) return;
  // One row per person, webinar and question — the latest answer wins.
  const unique = new Map(rows.map((r) => [`${r.subscriber_id}|${r.source_label}|${r.label}`, r]));
  const supabase = getAdminClient();
  for (const batch of chunkArray([...unique.values()], 200)) {
    const { error } = await supabase
      .from("subscriber_facts")
      .upsert(batch, { onConflict: "subscriber_id,source,source_label,label" });
    if (error) {
      if (!/subscriber_facts|schema cache|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) {
        console.error("[funnel-brand-sync] facts:", error.message);
      }
      return;
    }
  }
}

export async function syncFunnelBrandContacts(
  options: {
    full?: boolean;
    settings?: FunnelBrandSyncSettings;
    actor?: { id: string | null; name: string };
  } = {},
): Promise<FunnelBrandSyncResult> {
  const config = getFunnelBrandConfig();
  if (!config) {
    return {
      ok: false,
      message: "Липсва FUNNEL_BRAND_API_KEY. Добави ключа от Launchify в env на сайта.",
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
  const settings = options.settings
    ? parseSyncSettings(options.settings)
    : parseSyncSettings(state?.settings);

  if (options.settings) {
    // Saved on its own: if migration 081 is missing, the cursor must still be written.
    await saveSyncState(FUNNEL_BRAND_INTEGRATION, {
      settings: { ...(state?.settings ?? {}), ...settings },
    });
  }

  try {
    const outcome = await runSync(config, since, settings, options.actor);
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
  settings: FunnelBrandSyncSettings,
  actor: { id: string | null; name: string } | undefined,
): Promise<FunnelBrandSyncResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let cursor: string | null = null;
  const segments = new Set<string>();
  const seeds = new Map<string, SegmentSeed>();
  const errors: string[] = [];
  const disabled = new Set(settings.disabledFunnels);
  const funnelNames = new Map<string, string>();
  const history: Parameters<typeof recordSubscriberHistory>[0] = [];
  const facts: Parameters<typeof saveFacts>[0] = [];
  const now = new Date().toISOString();

  function addSeed(seed: SegmentSeed) {
    if (!seeds.has(seed.key)) seeds.set(seed.key, seed);
  }

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchFunnelBrandPage(config, {
      since,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    for (const f of result.funnels ?? []) {
      if (f.segment && f.name) funnelNames.set(f.segment, f.name);
    }

    for (const contact of result.contacts) {
      if (contact.unsubscribed) {
        skipped += 1;
        continue;
      }
      const funnelSegment = contact.segment?.trim() ?? "";
      if (funnelSegment && disabled.has(funnelSegment)) {
        skipped += 1;
        continue;
      }

      const funnelName =
        funnelNames.get(funnelSegment) || contact.segmentName?.trim() || funnelSegment;
      const target = funnelSegment
        ? resolveFunnelTarget(funnelSegment, funnelName, settings)
        : null;
      if (target) addSeed(target);

      const tags = new Set<string>();
      for (const raw of contact.tags) {
        const tag = raw.trim();
        if (!tag) continue;
        // The webinar's own group is swapped for the chosen one.
        if (tag === funnelSegment) continue;
        const mapped = resolveTagTarget(tag, settings);
        if (!mapped) continue;
        tags.add(mapped.key);
        addSeed(mapped);
      }
      if (target) tags.add(target.key);
      if (settings.alsoAddKey) tags.add(settings.alsoAddKey);
      const tagList = [...tags];
      tagList.forEach((tag) => segments.add(tag));

      try {
        const outcome = await upsertContact(contact, tagList);
        if (outcome.id) {
          for (const fact of launchifyFacts(contact)) {
            facts.push({
              subscriber_id: outcome.id,
              source: "launchify",
              source_label: funnelName || "",
              label: fact.label,
              value: fact.value,
              updated_at: now,
            });
          }
        }
        if (outcome.kind === "skipped") {
          skipped += 1;
          continue;
        }
        if (outcome.kind === "created") created += 1;
        else updated += 1;
        if (outcome.id) {
          history.push({
            subscriber_id: outcome.id,
            kind: "sync",
            details: {
              via: "launchify",
              created: outcome.kind === "created",
              funnel: funnelName || null,
              added: outcome.added,
            },
            actor_id: actor?.id ?? null,
            actor_name: actor?.name ?? "Launchify",
          });
        }
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
  await recordSubscriberHistory(history);
  await saveFacts(facts);

  const touched = created + updated;
  const message =
    touched === 0 && skipped === 0
      ? "Няма нови контакти от Launchify."
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
