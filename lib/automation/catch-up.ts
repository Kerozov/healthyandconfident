import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, Locale, Segment, SegmentGroup } from "@/lib/supabase/types";
import {
  continueChainStep,
  retryFailedAutomation,
  type AutomationRunContext,
} from "@/lib/automation/run";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A step this late is dropped rather than sent out of context. */
export const CHAIN_CATCH_UP_MAX_OVERDUE_DAYS = 14;

/** A first email that failed is retried for this long after the trigger. */
export const FAILED_RETRY_DAYS = 3;

export type ChainCatchUpReport = {
  steps: number;
  candidates: number;
  sent: number;
  scheduled: number;
  skipped: number;
  failed: number;
  /** First steps (no parent) that failed at trigger time and were retried. */
  retried: number;
  errors: number;
  timedOut: boolean;
  /** Why nothing ran at all, when that is the case. */
  notice?: string;
};

type ParentRow = {
  email: string;
  sent_at: string;
  scheduled_for: string | null;
};

type ChildRow = { email: string; status: string };

type FailedRow = { email: string; sent_at: string };

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  locale: Locale | null;
  tags: string[] | null;
  status: string;
  source: string | null;
};

/** Parent → child order, so a step is handled before the steps after it. */
function chainDepth(step: Automation, byId: Map<string, Automation>): number {
  let depth = 0;
  let cur: Automation | undefined = step;
  const seen = new Set<string>();
  while (cur?.after_automation_id && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth += 1;
    cur = byId.get(cur.after_automation_id);
  }
  return depth;
}

function contextFor(sub: SubscriberRow): AutomationRunContext {
  return {
    email: sub.email,
    name: sub.name,
    phone: sub.phone,
    locale: sub.locale === "en" ? "en" : "bg",
    subscriberId: sub.id,
    tags: sub.tags ?? [],
    isNew: false,
    source: sub.source ?? undefined,
  };
}

async function loadSubscribers(emails: string[]): Promise<Map<string, SubscriberRow>> {
  const supabase = getAdminClient();
  const out = new Map<string, SubscriberRow>();
  for (const chunk of chunkArray(emails, 200)) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("id, email, name, phone, locale, tags, status, source")
      .in("email", chunk);
    if (error) throw new Error(`subscribers: ${error.message}`);
    for (const row of (data as SubscriberRow[]) ?? []) {
      out.set(row.email.trim().toLowerCase(), row);
    }
  }
  return out;
}

/**
 * Sequences are laid out once, at the moment someone signs up. Anything that
 * misses that moment never caught up: a step created or re-enabled later (new
 * steps start disabled), a step whose jobs were cancelled when it was switched
 * off, a step that failed or was skipped (no text yet, worker down), or a
 * signup request that died half-way through the chain. That is the "two
 * emails, then nothing" pattern.
 *
 * This walks every enabled chain step and queues it for everyone whose previous
 * step went out (or is queued) but who has no live delivery for this one, timed
 * from that previous step. Then it retries first steps that failed when their
 * trigger fired. Safe to run repeatedly: dedupe is by delivery row and the
 * worker idempotency key, and every outcome is written on the delivery row.
 */
export async function catchUpAutomationChains(opts?: {
  automationIds?: string[];
  timeBudgetMs?: number;
}): Promise<ChainCatchUpReport> {
  const report: ChainCatchUpReport = {
    steps: 0,
    candidates: 0,
    sent: 0,
    scheduled: 0,
    skipped: 0,
    failed: 0,
    retried: 0,
    errors: 0,
    timedOut: false,
  };
  if (!isNotificationWorkerConfigured()) {
    report.notice = "NOTIFICATION_WORKER_URL / API_KEY не са зададени — нищо не е изпратено.";
    console.error(`[automation] catch-up: ${report.notice}`);
    return report;
  }

  const deadline = Date.now() + (opts?.timeBudgetMs ?? 50_000);
  const maxOverdueMs = CHAIN_CATCH_UP_MAX_OVERDUE_DAYS * DAY_MS;
  const supabase = getAdminClient();

  const [
    { data: autoRows, error },
    { data: segmentRows, error: segmentError },
    { data: groupRows, error: groupError },
  ] = await Promise.all([
    supabase.from("automations").select("*"),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);
  const loadError = error ?? segmentError ?? groupError;
  if (loadError) {
    console.error("[automation] catch-up load:", loadError.message);
    report.errors += 1;
    report.notice = `Грешка при зареждане: ${loadError.message}`;
    return report;
  }

  const all = (autoRows as Automation[]) ?? [];
  const byId = new Map(all.map((a) => [a.id, a]));
  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];
  const only = opts?.automationIds?.length ? new Set(opts.automationIds) : null;

  const steps = all
    .filter((a) => a.enabled && a.after_automation_id && (!only || only.has(a.id)))
    .sort((a, b) => chainDepth(a, byId) - chainDepth(b, byId));
  report.steps = steps.length;

  for (const step of steps) {
    if (Date.now() > deadline) {
      report.timedOut = true;
      break;
    }

    try {
      // A parent older than delay + overdue window can only yield skips.
      const delayMs =
        (step.delay_days ?? 0) * DAY_MS + DAY_MS + (step.delay_minutes ?? 0) * 60_000;
      const since = new Date(Date.now() - maxOverdueMs - delayMs).toISOString();

      const parents = await fetchAllRows<ParentRow>((from, to) => {
        let q = supabase
          .from("automation_deliveries")
          .select("email, sent_at, scheduled_for")
          .eq("automation_id", step.after_automation_id!)
          .in("status", ["sent", "scheduled"]);
        if (!step.send_date) {
          q = q.or(`sent_at.gte."${since}",scheduled_for.gte."${since}"`);
        }
        return q.order("id").range(from, to);
      });
      if (parents.length === 0) continue;

      const children = new Map<string, ChildRow>();
      for (const chunk of chunkArray(parents.map((p) => p.email), 200)) {
        const { data, error: childError } = await supabase
          .from("automation_deliveries")
          .select("email, status")
          .eq("automation_id", step.id)
          .in("email", chunk);
        if (childError) throw new Error(`deliveries: ${childError.message}`);
        for (const row of (data as ChildRow[]) ?? []) children.set(row.email, row);
      }

      // Everyone whose step is not live: missing, cancelled (step was off),
      // failed, or skipped earlier — the cause may have been fixed since.
      const pending = parents.filter((p) => {
        const child = children.get(p.email);
        return !child || (child.status !== "sent" && child.status !== "scheduled");
      });
      if (pending.length === 0) continue;

      const subscribers = await loadSubscribers(pending.map((p) => p.email));

      for (const parent of pending) {
        if (Date.now() > deadline) {
          report.timedOut = true;
          break;
        }
        const sub = subscribers.get(parent.email.trim().toLowerCase());
        if (!sub || sub.status !== "subscribed") continue;
        report.candidates += 1;

        const parentAt = new Date(parent.scheduled_for ?? parent.sent_at);
        try {
          const result = await continueChainStep(
            step,
            contextFor(sub),
            Number.isNaN(parentAt.getTime()) ? new Date() : parentAt,
            { segments, groups, maxOverdueMs },
          );
          report[result === "already" ? "skipped" : result] += 1;
        } catch (err) {
          report.errors += 1;
          console.error(`[automation] catch-up ${step.name} ${sub.email}:`, err);
        }
      }
    } catch (err) {
      report.errors += 1;
      console.error(`[automation] catch-up step ${step.name}:`, err);
    }
  }

  // First steps that failed when the trigger fired (worker down, timeout).
  const since = new Date(Date.now() - FAILED_RETRY_DAYS * DAY_MS).toISOString();
  const firstSteps = all.filter(
    (a) => a.enabled && !a.after_automation_id && (!only || only.has(a.id)),
  );
  for (const automation of firstSteps) {
    if (Date.now() > deadline) {
      report.timedOut = true;
      break;
    }
    try {
      const failed = await fetchAllRows<FailedRow>((from, to) =>
        supabase
          .from("automation_deliveries")
          .select("email, sent_at")
          .eq("automation_id", automation.id)
          .eq("status", "failed")
          .gte("sent_at", since)
          .order("id")
          .range(from, to),
      );
      if (failed.length === 0) continue;

      const subscribers = await loadSubscribers(failed.map((row) => row.email));
      for (const row of failed) {
        if (Date.now() > deadline) {
          report.timedOut = true;
          break;
        }
        const sub = subscribers.get(row.email.trim().toLowerCase());
        if (!sub || sub.status !== "subscribed") continue;
        report.candidates += 1;
        report.retried += 1;
        try {
          const failedAt = new Date(row.sent_at);
          const result = await retryFailedAutomation(
            automation,
            contextFor(sub),
            Number.isNaN(failedAt.getTime()) ? new Date() : failedAt,
            { segments, groups },
          );
          report[result === "already" ? "skipped" : result] += 1;
        } catch (err) {
          report.errors += 1;
          console.error(`[automation] retry ${automation.name} ${sub.email}:`, err);
        }
      }
    } catch (err) {
      report.errors += 1;
      console.error(`[automation] retry step ${automation.name}:`, err);
    }
  }

  console.info(
    `[automation] catch-up steps=${report.steps} candidates=${report.candidates} ` +
      `sent=${report.sent} scheduled=${report.scheduled} skipped=${report.skipped} ` +
      `failed=${report.failed} retried=${report.retried} errors=${report.errors}` +
      (report.timedOut ? " (time budget hit)" : ""),
  );
  return report;
}
