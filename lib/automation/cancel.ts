import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience } from "@/lib/automation/audience";
import {
  cancelEmailJob,
  cancelEmailJobsBulk,
  removeEmailJobRecipients,
} from "@/lib/worker/email";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";
import { cancelSmsJob } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

type DeliveryCancelRow = {
  id: string;
  automation_id: string;
  worker_job_id: string | null;
  channel: string;
};

export async function cancelWorkerJob(
  workerJobId: string | null,
  channel: string,
): Promise<boolean> {
  if (!workerJobId || !isNotificationWorkerConfigured()) return true;

  let workerCanceled =
    channel === "sms"
      ? await cancelSmsJob(workerJobId)
      : await cancelEmailJob(workerJobId);

  if (!workerCanceled) {
    workerCanceled =
      channel === "sms"
        ? await cancelSmsJob(workerJobId)
        : await cancelEmailJob(workerJobId);
  }

  if (!workerCanceled) {
    console.error(`[automation] failed to cancel worker job ${workerJobId}`);
    return false;
  }
  return true;
}

async function cancelDeliveryRow(row: {
  id: string;
  worker_job_id: string | null;
  channel: string;
}): Promise<boolean> {
  const workerCanceled = await cancelWorkerJob(row.worker_job_id, row.channel);
  if (!workerCanceled) return false;

  const supabase = getAdminClient();
  await supabase
    .from("automation_deliveries")
    .update({ status: "canceled" })
    .eq("id", row.id);
  return true;
}

async function loadScheduledDeliveries(email: string): Promise<DeliveryCancelRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, automation_id, worker_job_id, channel")
    .eq("email", email)
    .eq("status", "scheduled");
  return (data as DeliveryCancelRow[]) ?? [];
}

async function cancelDeliveryRows(
  rows: DeliveryCancelRow[],
): Promise<{ canceled: number; failed: number }> {
  let canceled = 0;
  let failed = 0;
  for (const row of rows) {
    const ok = await cancelDeliveryRow({
      id: row.id,
      worker_job_id: row.worker_job_id,
      channel: row.channel,
    });
    if (ok) canceled += 1;
    else failed += 1;
  }
  return { canceled, failed };
}

/**
 * If step 2 of a sequence is cancelled, steps 3+ that were already queued
 * in the worker must not keep going — they were scheduled up-front from the parent.
 */
function withChainedDescendants(
  ineligibleIds: Set<string>,
  rows: DeliveryCancelRow[],
  automationsById: Map<string, Automation>,
): Set<string> {
  const cancelIds = new Set(ineligibleIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (cancelIds.has(row.automation_id)) continue;
      const parentId = automationsById.get(row.automation_id)?.after_automation_id;
      if (parentId && cancelIds.has(parentId)) {
        cancelIds.add(row.automation_id);
        grew = true;
      }
    }
  }
  return cancelIds;
}

/**
 * Cancel scheduled automation jobs when subscriber tags change and they no longer
 * match the automation audience (e.g. paid → added to an exclude group, or they
 * left the include segment). Also stops already-queued steps further down the same chain.
 */
export async function cancelIneligibleAutomationDeliveriesForSubscriber(
  email: string,
  tags: string[],
): Promise<{ canceled: number; checked: number; failed: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { canceled: 0, checked: 0, failed: 0 };

  const supabase = getAdminClient();
  const [rows, { data: segmentRows }, { data: groupRows }] = await Promise.all([
    loadScheduledDeliveries(normalized),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);

  if (rows.length === 0) return { canceled: 0, checked: 0, failed: 0 };

  const automationIds = Array.from(new Set(rows.map((r) => r.automation_id)));
  const { data: automationRows } = await supabase
    .from("automations")
    .select("*")
    .in("id", automationIds);

  const automationsById = new Map(
    ((automationRows as Automation[]) ?? []).map((a) => [a.id, a]),
  );
  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];

  const ineligible = new Set<string>();
  for (const row of rows) {
    const automation = automationsById.get(row.automation_id);
    if (!automation) continue;
    if (!subscriberMatchesAutomationAudience(automation, tags, segments, groups)) {
      ineligible.add(row.automation_id);
    }
  }

  const cancelAutomationIds = withChainedDescendants(
    ineligible,
    rows,
    automationsById,
  );
  const toCancel = rows.filter((row) => cancelAutomationIds.has(row.automation_id));
  const { canceled, failed } = await cancelDeliveryRows(toCancel);

  return { canceled, checked: rows.length, failed };
}

const EMAIL_BATCH = 100;

type ScheduledRow = { id: string; worker_job_id: string | null };

/**
 * Everything still queued for many addresses at once — bulk subscriber delete.
 *
 * It used to only flip the rows to `canceled` in our tables to stay fast, but
 * the worker kept the jobs and still sent them: deleted people went on getting
 * the drip and any scheduled campaign. Now the worker is told, in bulk:
 * automation and reminder jobs through the batch cancel endpoint (200 per
 * call), campaigns by taking these addresses out of the shared campaign job.
 */
export async function cancelScheduledMailForEmails(
  emails: string[],
): Promise<{ failed: number }> {
  const normalized = [
    ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ];
  if (normalized.length === 0) return { failed: 0 };

  const supabase = getAdminClient();
  const workerOn = isNotificationWorkerConfigured();
  let failed = 0;

  for (let i = 0; i < normalized.length; i += EMAIL_BATCH) {
    const batch = normalized.slice(i, i + EMAIL_BATCH);

    const [autoRows, campRows, contactRows] = await Promise.all([
      fetchAllRows<ScheduledRow & { channel: string }>((from, to) =>
        supabase
          .from("automation_deliveries")
          .select("id, worker_job_id, channel")
          .in("email", batch)
          .eq("status", "scheduled")
          .order("id")
          .range(from, to),
      ),
      fetchAllRows<ScheduledRow & { email: string }>((from, to) =>
        supabase
          .from("campaign_deliveries")
          .select("id, email, worker_job_id")
          .in("email", batch)
          .eq("status", "scheduled")
          .order("id")
          .range(from, to),
      ),
      fetchAllRows<{ id: string }>((from, to) =>
        supabase.from("contacts").select("id").in("email", batch).order("id").range(from, to),
      ),
    ]);

    const contactIds = contactRows.map((row) => row.id);
    const reminderRows =
      contactIds.length > 0
        ? await fetchAllRows<ScheduledRow>((from, to) =>
            supabase
              .from("contact_worker_jobs")
              .select("id, worker_job_id")
              .in("contact_id", contactIds)
              .eq("status", "pending")
              .order("id")
              .range(from, to),
          )
        : [];

    const autoCanceled: string[] = [];
    const campCanceled: string[] = [];
    const reminderCanceled: string[] = [];

    if (!workerOn) {
      autoCanceled.push(...autoRows.map((r) => r.id));
      campCanceled.push(...campRows.map((r) => r.id));
      reminderCanceled.push(...reminderRows.map((r) => r.id));
    } else {
      // Per-person email jobs (automations + payment reminders): one bulk call.
      const emailAuto = autoRows.filter((r) => r.channel !== "sms");
      const bulk = await cancelEmailJobsBulk([
        ...emailAuto.map((r) => r.worker_job_id ?? ""),
        ...reminderRows.map((r) => r.worker_job_id ?? ""),
      ]);
      failed += bulk.failed.size;
      const stopped = (row: ScheduledRow) =>
        !row.worker_job_id || bulk.canceled.has(row.worker_job_id);
      autoCanceled.push(...emailAuto.filter(stopped).map((r) => r.id));
      reminderCanceled.push(...reminderRows.filter(stopped).map((r) => r.id));

      for (const row of autoRows.filter((r) => r.channel === "sms")) {
        if (await cancelWorkerJob(row.worker_job_id, "sms")) autoCanceled.push(row.id);
        else failed += 1;
      }

      // Campaigns: one shared job per campaign — remove only these addresses.
      const byJob = new Map<string, typeof campRows>();
      for (const row of campRows) {
        if (!row.worker_job_id) {
          campCanceled.push(row.id);
          continue;
        }
        const list = byJob.get(row.worker_job_id) ?? [];
        list.push(row);
        byJob.set(row.worker_job_id, list);
      }
      for (const [jobId, rows] of byJob) {
        if (await removeEmailJobRecipients(jobId, rows.map((r) => r.email))) {
          campCanceled.push(...rows.map((r) => r.id));
        } else {
          failed += rows.length;
        }
      }
    }

    for (const ids of chunkArray(autoCanceled, 200)) {
      await supabase.from("automation_deliveries").update({ status: "canceled" }).in("id", ids);
    }
    for (const ids of chunkArray(campCanceled, 200)) {
      await supabase.from("campaign_deliveries").update({ status: "canceled" }).in("id", ids);
    }
    const now = new Date().toISOString();
    for (const ids of chunkArray(reminderCanceled, 200)) {
      await supabase
        .from("contact_worker_jobs")
        .update({ status: "canceled", canceled_at: now })
        .in("id", ids);
    }
  }

  if (failed > 0) {
    console.error(`[automation] bulk cancel: ${failed} job(s) could not be stopped`);
  }
  return { failed };
}

/** Cancel every pending worker job for this address (unsubscribe, admin opt-out). */
export async function cancelAllScheduledAutomationDeliveriesForSubscriber(
  email: string,
): Promise<{ canceled: number; failed: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { canceled: 0, failed: 0 };
  const rows = await loadScheduledDeliveries(normalized);
  return cancelDeliveryRows(rows);
}

/** Stop scheduled one-off campaigns for this address. */
export async function cancelScheduledCampaignDeliveriesForSubscriber(
  email: string,
): Promise<{ canceled: number; failed: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { canceled: 0, failed: 0 };

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("campaign_deliveries")
    .select("id, worker_job_id")
    .eq("email", normalized)
    .eq("status", "scheduled");

  const rows =
    (data as { id: string; worker_job_id: string | null }[] | null) ?? [];
  let canceled = 0;
  let failed = 0;

  for (const row of rows) {
    // A campaign is one job for the whole audience: cancelling the job would
    // stop the send for everyone because this one person unsubscribed.
    const ok =
      !row.worker_job_id ||
      !isNotificationWorkerConfigured() ||
      (await removeEmailJobRecipients(row.worker_job_id, [normalized]));
    if (!ok) {
      failed += 1;
      continue;
    }
    await supabase
      .from("campaign_deliveries")
      .update({ status: "canceled" })
      .eq("id", row.id);
    canceled += 1;
  }

  return { canceled, failed };
}

/**
 * Everything still queued for this person: automations, campaigns, payment reminders.
 * Used on unsubscribe / admin opt-out / delete.
 */
export async function cancelAllScheduledMailForSubscriber(
  email: string,
): Promise<{ automations: number; campaigns: number; reminders: number; failed: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { automations: 0, campaigns: 0, reminders: 0, failed: 0 };
  }

  const [automations, campaigns] = await Promise.all([
    cancelAllScheduledAutomationDeliveriesForSubscriber(normalized),
    cancelScheduledCampaignDeliveriesForSubscriber(normalized),
  ]);

  let reminders = 0;
  const supabase = getAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (contact) {
    const { cancelContactReminders } = await import("@/lib/notification-worker");
    reminders = await cancelContactReminders((contact as { id: string }).id);
  }

  return {
    automations: automations.canceled,
    campaigns: campaigns.canceled,
    reminders,
    failed: automations.failed + campaigns.failed,
  };
}

/**
 * Cancel all pending worker jobs for an automation and mark deliveries canceled.
 *
 * Walks the queue with keyset paging on `id`. A single response stops at
 * PostgREST's 1000-row cap, so turning off a busy automation used to leave every
 * delivery past the first thousand scheduled — and they still went out. Offset
 * paging would not do either: cancelling removes rows from the filter as we go,
 * and a row the worker refuses to cancel keeps its `scheduled` status, so
 * re-reading the first page forever is a live-lock. `id` only ever moves
 * forward.
 */
export async function cancelAutomationScheduledJobs(
  automationId: string,
): Promise<{ canceled: number }> {
  const supabase = getAdminClient();
  const PAGE = 500;

  let canceled = 0;
  let after: string | null = null;

  for (let page = 0; page < 400; page += 1) {
    let q = supabase
      .from("automation_deliveries")
      .select("id, worker_job_id, channel")
      .eq("automation_id", automationId)
      .eq("status", "scheduled")
      .not("worker_job_id", "is", null)
      .order("id", { ascending: true })
      .limit(PAGE);
    if (after) q = q.gt("id", after);

    const { data, error } = await q;
    if (error) {
      console.error("[automation] cancel scheduled:", error.message);
      break;
    }

    const rows =
      (data as
        | { id: string; worker_job_id: string | null; channel: string }[]
        | null) ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const ok = await cancelDeliveryRow({
        id: row.id,
        worker_job_id: row.worker_job_id,
        channel: row.channel,
      });
      if (ok) canceled += 1;
    }

    after = rows[rows.length - 1].id;
    if (rows.length < PAGE) break;
  }

  return { canceled };
}
