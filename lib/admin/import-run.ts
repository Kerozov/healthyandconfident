import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { applyEnglishRecipientTag } from "@/i18n/subscriber-locale";
import { ensureSubscriberSegmentKeys } from "@/lib/segments/ensure";
import { runAutomations } from "@/lib/automation/send";
import { chunkArray } from "@/lib/utils";
import type { ImportSubscriberRow } from "@/lib/admin/import-subscribers";

export type ImportBatchResult = {
  ok: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  message?: string;
};

/**
 * Rows the browser sends per request.
 *
 * Small enough to stay well inside the 1 MB body limit, and small enough that a
 * batch of all-existing subscribers — each one costing a cancel sweep plus an
 * automation run — still finishes comfortably inside the route's 60s budget.
 */
export const IMPORT_BATCH_SIZE = 50;

type ExistingRow = {
  id: string;
  email: string;
  tags: string[] | null;
  source: string | null;
  consent: boolean | null;
  created_at: string;
};

type Payload = {
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  facebook_url: string | null;
  locale: "bg" | "en";
  status: "subscribed" | "unsubscribed";
  source: string;
  tags: string[];
  notes: string | null;
  consent: boolean;
  created_at?: string;
};

/** Runs `task` over `items` a few at a time — imports must not open a connection per row. */
async function mapLimit<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        await task(items[index]);
      } catch (err) {
        console.error(
          "[import] side effect:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  });
  await Promise.all(workers);
}

async function loadExisting(emails: string[]): Promise<Map<string, ExistingRow>> {
  const supabase = getAdminClient();
  const found = new Map<string, ExistingRow>();

  // One round trip per 200 e-mails instead of one per row — this is what used to
  // make a big import time out.
  for (const slice of chunkArray(emails, 200)) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("id, email, tags, source, consent, created_at")
      .in("email", slice);

    if (error) throw new Error(error.message);
    for (const row of (data as ExistingRow[] | null) ?? []) {
      found.set(row.email.toLowerCase(), row);
    }
  }

  return found;
}

/**
 * Upserts one batch of parsed rows.
 *
 * The browser splits a spreadsheet into `IMPORT_BATCH_SIZE` chunks and posts them
 * one at a time, so neither the request body nor the function runtime grows with
 * the size of the file.
 */
export async function importSubscriberBatch(
  rows: ImportSubscriberRow[],
  { mergeSegments = true }: { mergeSegments?: boolean } = {},
): Promise<ImportBatchResult> {
  const errors: string[] = [];
  const pushError = (message: string) => {
    if (errors.length < 5) errors.push(message);
  };

  // A single upsert statement cannot touch the same e-mail twice, so duplicates
  // inside one file collapse here — the later row wins.
  const byEmail = new Map<string, ImportSubscriberRow>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, { ...row, email });
  }

  const unique = [...byEmail.values()];
  if (unique.length === 0) {
    return { ok: true, created: 0, updated: 0, failed: 0, errors: [] };
  }

  await ensureSubscriberSegmentKeys(
    unique.flatMap((row) => row.segments ?? []).filter(Boolean),
  );

  const supabase = getAdminClient();
  const existing = await loadExisting(unique.map((row) => row.email));

  const prepared = unique.map((row) => {
    const before = existing.get(row.email) ?? null;
    const locale = row.locale === "en" ? "en" : "bg";
    const tags = Array.from(
      new Set((row.segments ?? []).map((t) => t.trim()).filter(Boolean)),
    );
    const mergedTags = applyEnglishRecipientTag(
      before && mergeSegments
        ? Array.from(new Set([...(before.tags ?? []), ...tags]))
        : tags,
      locale,
    );

    const name =
      row.name?.trim() ||
      [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ") ||
      null;

    const payload: Payload = {
      email: row.email,
      name,
      first_name: row.first_name?.trim() || null,
      last_name: row.last_name?.trim() || null,
      phone: row.phone?.trim() || null,
      facebook_url: row.facebook_url?.trim() || null,
      locale,
      status: row.status === "unsubscribed" ? "unsubscribed" : "subscribed",
      source: row.source?.trim() || before?.source || "import",
      tags: mergedTags,
      notes: row.notes?.trim() || null,
      consent: row.consent ?? before?.consent ?? true,
      ...(!before && row.created_at ? { created_at: row.created_at } : {}),
    };

    return { payload, before, priorTags: before?.tags ?? [] };
  });

  let failed = 0;
  let written = prepared;

  const { error } = await supabase
    .from("subscribers")
    .upsert(
      prepared.map((p) => p.payload),
      { onConflict: "email" },
    );

  if (error) {
    // Fall back to one statement per row so a single bad row cannot sink the batch.
    written = [];
    for (const item of prepared) {
      const single = await supabase
        .from("subscribers")
        .upsert(item.payload, { onConflict: "email" });
      if (single.error) {
        failed += 1;
        pushError(`${item.payload.email}: ${single.error.message}`);
        continue;
      }
      written.push(item);
    }
  }

  const created = written.filter((item) => !item.before).length;
  const updated = written.length - created;

  // Ids for rows that were just created — automations want the subscriber id.
  const idByEmail = new Map<string, string>();
  for (const item of written) {
    if (item.before) idByEmail.set(item.payload.email, item.before.id);
  }
  const newEmails = written
    .filter((item) => !item.before)
    .map((item) => item.payload.email);
  if (newEmails.length > 0) {
    for (const slice of chunkArray(newEmails, 200)) {
      const { data } = await supabase
        .from("subscribers")
        .select("id, email")
        .in("email", slice);
      for (const row of (data as { id: string; email: string }[] | null) ?? []) {
        idByEmail.set(row.email.toLowerCase(), row.id);
      }
    }
  }

  await mapLimit(written, 6, async (item) => {
    const { payload, before, priorTags } = item;

    if (payload.status === "subscribed") {
      if (before) {
        const { cancelIneligibleAutomationDeliveriesForSubscriber } = await import(
          "@/lib/automation/cancel"
        );
        await cancelIneligibleAutomationDeliveriesForSubscriber(
          payload.email,
          payload.tags,
        );
      }

      await runAutomations({
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        locale: payload.locale,
        subscriberId: idByEmail.get(payload.email) ?? null,
        tags: payload.tags,
        priorTags: before ? priorTags : undefined,
        isNew: !before,
        source: "import",
      });
    } else if (before) {
      const { cancelAllScheduledMailForSubscriber } = await import(
        "@/lib/automation/cancel"
      );
      await cancelAllScheduledMailForSubscriber(payload.email);
    }
  });

  const total = created + updated;

  return {
    ok: total > 0 || failed === 0,
    created,
    updated,
    failed,
    errors,
    message:
      total === 0 && failed > 0
        ? (errors[0] ?? "Import failed.")
        : undefined,
  };
}
