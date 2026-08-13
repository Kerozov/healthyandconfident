import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience } from "@/lib/automation/audience";
import { cancelEmailJob } from "@/lib/worker/email";
import { cancelSmsJob } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

type DeliveryCancelRow = {
  id: string;
  automation_id: string;
  worker_job_id: string | null;
  channel: string;
};

async function cancelWorkerJob(
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
    const ok = await cancelWorkerJob(row.worker_job_id, "email");
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

/** Cancel all pending worker jobs for an automation and mark deliveries canceled. */
export async function cancelAutomationScheduledJobs(
  automationId: string,
): Promise<{ canceled: number }> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, worker_job_id, channel")
    .eq("automation_id", automationId)
    .eq("status", "scheduled")
    .not("worker_job_id", "is", null);

  let canceled = 0;

  for (const row of data ?? []) {
    const ok = await cancelDeliveryRow({
      id: row.id as string,
      worker_job_id: row.worker_job_id as string | null,
      channel: row.channel as string,
    });
    if (ok) canceled += 1;
  }

  return { canceled };
}
