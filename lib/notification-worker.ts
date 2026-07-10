import "server-only";

import {
  cancelEmailJob,
  getJobStatus,
  scheduleEmail,
  type WorkerSendResult,
} from "@/lib/worker/email";
import {
  isNotificationWorkerConfigured,
  requireNotificationWorkerConfig,
} from "@/lib/worker/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { recordContactEvent } from "@/lib/contacts/events";
import { SEQUENCE_PRE_PAYMENT_REMINDERS } from "@/lib/contacts/types";
import type { ContactWorkerJob, ContactWorkerJobStatus } from "@/lib/contacts/types";

export type ScheduleEmailInput = {
  subject: string;
  html: string;
  recipients: string[];
  sendAt: string;
  idempotencyKey?: string;
  from?: string;
  replyTo?: string;
};

export type ScheduleContactEmailInput = ScheduleEmailInput & {
  contactId: string;
  sequenceKey: string;
};

export type CancelJobResult = "canceled" | "not_found" | "failed";

/** Cancel a single worker job. Returns not_found on 404 (already sent/gone). */
export async function cancelJob(jobId: string): Promise<CancelJobResult> {
  if (!isNotificationWorkerConfigured()) return "failed";

  const { url, key } = requireNotificationWorkerConfig();

  const res = await fetch(`${url}/api/v1/jobs/${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });

  if (res.status === 404) return "not_found";
  return res.ok ? "canceled" : "failed";
}

async function recordWorkerJob(input: {
  contactId: string;
  workerJobId: string;
  sequenceKey: string;
  idempotencyKey?: string;
  scheduledAt: string;
}): Promise<ContactWorkerJob> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("contact_worker_jobs")
    .insert({
      contact_id: input.contactId,
      worker_job_id: input.workerJobId,
      sequence_key: input.sequenceKey,
      idempotency_key: input.idempotencyKey ?? null,
      status: "pending",
      scheduled_at: input.scheduledAt,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505" && input.idempotencyKey) {
      const { data: existing } = await supabase
        .from("contact_worker_jobs")
        .select("*")
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existing) return existing as ContactWorkerJob;
    }
    throw new Error(error.message);
  }

  return data as ContactWorkerJob;
}

/** Schedule email via worker — no local job record (use scheduleContactEmail for sequences). */
export async function scheduleEmailJob(
  args: ScheduleEmailInput,
): Promise<WorkerSendResult | null> {
  if (!isNotificationWorkerConfigured()) return null;
  return scheduleEmail(args);
}

/** Schedule email and persist worker_job_id for sequence orchestration. */
export async function scheduleContactEmail(
  args: ScheduleContactEmailInput,
): Promise<{ jobId: string; localJobId: string } | null> {
  if (!isNotificationWorkerConfigured()) return null;

  const res = await scheduleEmail({
    subject: args.subject,
    html: args.html,
    recipients: args.recipients,
    sendAt: args.sendAt,
    idempotencyKey: args.idempotencyKey,
    from: args.from,
    replyTo: args.replyTo,
  });

  const local = await recordWorkerJob({
    contactId: args.contactId,
    workerJobId: res.jobId,
    sequenceKey: args.sequenceKey,
    idempotencyKey: args.idempotencyKey,
    scheduledAt: args.sendAt,
  });

  return { jobId: res.jobId, localJobId: local.id };
}

async function markLocalJobStatus(
  localJobId: string,
  status: ContactWorkerJobStatus,
  canceledAt?: string | null,
): Promise<void> {
  const supabase = getAdminClient();
  await supabase
    .from("contact_worker_jobs")
    .update({
      status,
      ...(canceledAt !== undefined ? { canceled_at: canceledAt } : {}),
    })
    .eq("id", localJobId);
}

/** Cancel all pending jobs for a contact + sequence. Returns count canceled. */
export async function cancelContactReminders(
  contactId: string,
  sequenceKey: string = SEQUENCE_PRE_PAYMENT_REMINDERS,
): Promise<number> {
  const supabase = getAdminClient();
  const { data: rows } = await supabase
    .from("contact_worker_jobs")
    .select("id, worker_job_id, status")
    .eq("contact_id", contactId)
    .eq("sequence_key", sequenceKey)
    .eq("status", "pending");

  const pending = (rows as { id: string; worker_job_id: string; status: string }[]) ?? [];
  if (pending.length === 0) return 0;

  let canceledCount = 0;
  const now = new Date().toISOString();

  for (const row of pending) {
    const result = await cancelJob(row.worker_job_id);

    if (result === "canceled") {
      await markLocalJobStatus(row.id, "canceled", now);
      canceledCount += 1;
      continue;
    }

    if (result === "not_found") {
      const remote = await getJobStatus(row.worker_job_id);
      const remoteStatus = remote?.status ?? "sent";
      const localStatus: ContactWorkerJobStatus =
        remoteStatus === "canceled"
          ? "canceled"
          : remoteStatus === "failed"
            ? "failed"
            : "sent";
      await markLocalJobStatus(
        row.id,
        localStatus,
        localStatus === "canceled" ? now : null,
      );
      continue;
    }

    await markLocalJobStatus(row.id, "failed");
  }

  if (canceledCount > 0) {
    await recordContactEvent({
      contactId,
      eventType: "reminders_canceled",
      source: "system",
      metadata: { sequence_key: sequenceKey, count: canceledCount },
    });
  }

  return canceledCount;
}

/** Cancel a single local job row by its DB id (admin manual cancel). */
export async function cancelContactWorkerJobById(localJobId: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data: row } = await supabase
    .from("contact_worker_jobs")
    .select("id, worker_job_id, status, contact_id, sequence_key")
    .eq("id", localJobId)
    .maybeSingle();

  if (!row || (row as { status: string }).status !== "pending") return false;

  const job = row as {
    id: string;
    worker_job_id: string;
    contact_id: string;
    sequence_key: string;
  };

  const result = await cancelJob(job.worker_job_id);
  const now = new Date().toISOString();

  if (result === "canceled") {
    await markLocalJobStatus(job.id, "canceled", now);
    return true;
  }

  if (result === "not_found") {
    const remote = await getJobStatus(job.worker_job_id);
    const localStatus: ContactWorkerJobStatus =
      remote?.status === "canceled"
        ? "canceled"
        : remote?.status === "failed"
          ? "failed"
          : "sent";
    await markLocalJobStatus(job.id, localStatus, localStatus === "canceled" ? now : null);
    return localStatus === "canceled";
  }

  return false;
}

// Re-export for convenience
export { cancelEmailJob, getJobStatus, getJobReport } from "@/lib/worker/email";
