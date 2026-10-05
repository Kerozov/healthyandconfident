import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AutomationDelivery } from "@/lib/supabase/types";
import { getJobReport, type RecipientRow } from "@/lib/worker/email";
import { getSmsJobReport } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";

function isOpened(row: RecipientRow): boolean {
  return row.opened || row.status === "opened" || Boolean(row.openedAt);
}

function isBounced(row: RecipientRow): boolean {
  return row.status === "bounced";
}

function isFailed(row: RecipientRow): boolean {
  return row.status === "failed" || isBounced(row) || Boolean(row.error);
}

export function canResendToRecipient(row: RecipientRow): boolean {
  if (isFailed(row)) return false;
  if (!row.sentAt) return false;
  return !isOpened(row);
}

type DeliveryRow = Pick<
  AutomationDelivery,
  "id" | "worker_job_id" | "channel" | "status"
>;

export async function syncAutomationDelivery(
  delivery: DeliveryRow,
): Promise<boolean> {
  if (!delivery.worker_job_id) return false;

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  if (delivery.channel === "sms") {
    const report = await getSmsJobReport(delivery.worker_job_id);
    if (!report) return false;

    const recipientStatus =
      report.failed > 0 && report.sent === 0
        ? "failed"
        : report.sent > 0
          ? "sent"
          : report.status;

    await supabase
      .from("automation_deliveries")
      .update({
        recipient_status: recipientStatus,
        last_synced_at: now,
        ...(report.status === "sent" && delivery.status === "scheduled"
          ? { status: "sent" }
          : {}),
      })
      .eq("id", delivery.id);
    return true;
  }

  const report = await getJobReport(delivery.worker_job_id);
  if (!report) return false;

  const row = report.recipients[0];
  if (!row) {
    await supabase
      .from("automation_deliveries")
      .update({ last_synced_at: now })
      .eq("id", delivery.id);
    return true;
  }

  const workerStatus = report.status;
  let deliveryStatus = delivery.status;
  if (workerStatus === "sent" || workerStatus === "partial") {
    deliveryStatus = "sent";
  } else if (workerStatus === "failed" && delivery.status !== "canceled") {
    deliveryStatus = "failed";
  } else if (workerStatus === "canceled") {
    deliveryStatus = "canceled";
  } else if (workerStatus === "pending" && delivery.status === "scheduled") {
    deliveryStatus = "scheduled";
  }

  await supabase
    .from("automation_deliveries")
    .update({
      status: deliveryStatus,
      recipient_status: row.status,
      opened_at: row.openedAt,
      delivered_at: row.deliveredAt,
      last_synced_at: now,
      error: row.error,
    })
    .eq("id", delivery.id);

  return true;
}

type SyncCandidate = DeliveryRow &
  Pick<
    AutomationDelivery,
    "recipient_status" | "scheduled_for" | "sent_at" | "last_synced_at"
  >;

const SYNC_CANDIDATE_COLUMNS =
  "id, worker_job_id, channel, status, recipient_status, scheduled_for, sent_at, last_synced_at";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Opens cluster in the first days — older mail is asked about far less often. */
const RECENT_SEND_MS = 7 * 24 * HOUR;
const OLD_SEND_RECHECK_MS = 6 * HOUR;

export type DeliverySyncOptions = {
  /** Stop starting new worker calls after this long; the rest wait for the next run. */
  timeBudgetMs?: number;
  /** Parallel worker calls. Every automation delivery is its own worker job. */
  concurrency?: number;
  /**
   * Manual refresh: re-ask about every open-able row, not only stale ones. Rows
   * checked in the last half minute are still skipped so a double click is free.
   */
  force?: boolean;
};

export type DeliverySyncResult = {
  synced: number;
  /** Rows that needed a worker call this run. */
  total: number;
  /** Of `total`, left for the next run because the time budget ran out. */
  remaining: number;
};

/**
 * Whether the worker can tell us anything new about this row. An opened, bounced
 * or failed delivery is final for every counter we show (clicks are recorded
 * locally by the redirect, not by the worker), and a job that is not due yet has
 * nothing to report — asking anyway is what made one refresh take minutes.
 */
function needsWorkerSync(row: SyncCandidate, now: number, force: boolean): boolean {
  if (!row.worker_job_id) return false;
  const rs = row.recipient_status;
  if (rs === "opened" || rs === "bounced" || rs === "complained") return false;

  if (row.status === "scheduled") {
    const due = row.scheduled_for ? Date.parse(row.scheduled_for) : 0;
    if (Number.isFinite(due) && due > now) return false;
  }
  if (row.status === "failed" && row.last_synced_at) return false;
  // SMS has no opens — once the worker confirmed the send there is nothing left.
  if (row.channel === "sms" && row.status === "sent" && row.last_synced_at) return false;

  if (!row.last_synced_at) return true;
  const sinceSync = now - Date.parse(row.last_synced_at);
  if (!Number.isFinite(sinceSync)) return true;
  if (force) return sinceSync >= 30_000;

  const sentAge = now - Date.parse(row.sent_at);
  const interval =
    Number.isFinite(sentAge) && sentAge > RECENT_SEND_MS ? OLD_SEND_RECHECK_MS : 10 * MINUTE;
  return sinceSync >= interval;
}

async function loadSyncCandidates(
  automationIds: string[] | null,
): Promise<SyncCandidate[]> {
  const supabase = getAdminClient();
  // Paged with a unique sort key — one response stops at 1000 rows, which left
  // every delivery after the first thousand without opens forever.
  return fetchAllRows<SyncCandidate>(
    (from, to) => {
      let query = supabase
        .from("automation_deliveries")
        .select(SYNC_CANDIDATE_COLUMNS)
        .not("worker_job_id", "is", null)
        .in("status", ["sent", "scheduled", "failed"])
        .is("opened_at", null);
      if (automationIds) query = query.in("automation_id", automationIds);
      return query.order("id", { ascending: true }).range(from, to);
    },
    { pageSize: 1000, maxPages: 100 },
  );
}

/**
 * Pulls opens/deliveries/bounces from the worker into `automation_deliveries`.
 *
 * Every automation email is its own worker job, so this is one HTTP call per
 * row. It used to walk every row one at a time before the report could even
 * load — a few hundred recipients meant the request timed out and the screen
 * showed nothing. Now: only rows the worker can still change, never-checked
 * first, a few calls in parallel, and a time budget; whatever is left is picked
 * up by the next run.
 */
export async function syncDeliveries(
  automationIds: string[] | null,
  options: DeliverySyncOptions = {},
): Promise<DeliverySyncResult> {
  if (!isNotificationWorkerConfigured()) return { synced: 0, total: 0, remaining: 0 };
  if (automationIds && automationIds.length === 0) {
    return { synced: 0, total: 0, remaining: 0 };
  }

  const started = Date.now();
  const budget = options.timeBudgetMs ?? 40_000;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 6, 12));
  const force = options.force === true;

  const ids = automationIds
    ? [...new Set(automationIds.filter(Boolean))]
    : null;
  const candidates: SyncCandidate[] = [];
  // `.in()` goes into the URL — chunk it so a long automation list still fits.
  for (const batch of ids ? chunkArray(ids, 100) : [null]) {
    candidates.push(...(await loadSyncCandidates(batch)));
  }

  const now = Date.now();
  const queue = candidates
    .filter((row) => needsWorkerSync(row, now, force))
    .sort((a, b) => (a.last_synced_at ?? "").localeCompare(b.last_synced_at ?? ""));

  let next = 0;
  let synced = 0;
  const worker = async () => {
    while (next < queue.length && Date.now() - started < budget) {
      const row = queue[next++];
      try {
        if (await syncAutomationDelivery(row)) synced += 1;
      } catch {
        /* one bad job must not stop the rest */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));

  return { synced, total: queue.length, remaining: queue.length - next };
}

export async function syncAutomationDeliveries(
  automationId: string,
  options: DeliverySyncOptions = {},
): Promise<DeliverySyncResult> {
  return syncDeliveries([automationId], options);
}

/** The only delivery columns the counters need — a narrowed select satisfies it. */
export type AutomationStatsInput = Pick<
  AutomationDelivery,
  | "status"
  | "recipient_status"
  | "opened_at"
  | "delivered_at"
  | "click_count"
  | "last_synced_at"
>;

export function aggregateAutomationStats(
  deliveries: AutomationStatsInput[],
): import("@/lib/supabase/types").AutomationStats {
  let sent_count = 0;
  let scheduled_count = 0;
  let failed_count = 0;
  let opened_count = 0;
  let delivered_count = 0;
  let bounced_count = 0;
  let not_opened_count = 0;
  let clicked_count = 0;
  let unique_clickers_count = 0;
  let total_clicks = 0;
  let last_synced_at: string | null = null;

  for (const d of deliveries) {
    if (d.last_synced_at) {
      if (!last_synced_at || d.last_synced_at > last_synced_at) {
        last_synced_at = d.last_synced_at;
      }
    }

    if (d.status === "scheduled") scheduled_count += 1;
    if (d.status === "failed") failed_count += 1;
    if (d.status !== "sent") continue;

    sent_count += 1;

    const bounced =
      d.recipient_status === "bounced" || d.recipient_status === "complained";
    const opened = Boolean(d.opened_at) || d.recipient_status === "opened";
    const delivered =
      Boolean(d.delivered_at) ||
      d.recipient_status === "delivered" ||
      d.recipient_status === "opened" ||
      opened;

    if (bounced) bounced_count += 1;
    if (delivered) delivered_count += 1;
    if (opened) opened_count += 1;
    if (!opened && !bounced && d.recipient_status !== "failed") {
      not_opened_count += 1;
    }
    const clicks = d.click_count ?? 0;
    if (clicks > 0) {
      unique_clickers_count += 1;
      total_clicks += clicks;
    }
  }

  clicked_count = unique_clickers_count;

  return {
    sent_count,
    scheduled_count,
    failed_count,
    opened_count,
    delivered_count,
    bounced_count,
    not_opened_count,
    clicked_count,
    unique_clickers_count,
    total_clicks,
    last_synced_at,
  };
}
