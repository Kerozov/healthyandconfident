import "server-only";

import {
  getNotificationWorkerConfig,
  requireNotificationWorkerConfig,
} from "@/lib/worker/config";

/**
 * SMS adapter for notification-worker (Notifier.bg under the hood).
 * Sender + Notifier API key are configured on the worker tenant (seed), not here.
 *
 * POST /api/v1/sms/send      — immediate
 * POST /api/v1/sms/schedule  — delayed (sendAt)
 * GET  /api/v1/sms/jobs/:id  — status
 */

type SendArgs = {
  body: string;
  recipients: string[];
  idempotencyKey?: string;
};

type ScheduleArgs = SendArgs & {
  sendAt: string; // ISO
};

export type WorkerSmsSendResult = {
  jobId: string;
  status: string;
  sent?: number;
  failed?: number;
  sendAt?: string;
  invalid?: number;
  errors?: string[];
};

export type SmsJobTracking = {
  total: number;
  sent: number;
  failed: number;
  invalid: number;
  bounced: number;
  delivered: number;
};

export type SmsJobReport = {
  jobId: string;
  status: string;
  sendAt: string | null;
  sentAt: string | null;
  sent: number;
  failed: number;
  error: string | null;
  tracking: SmsJobTracking;
};

function getConfig() {
  const { url, key } = requireNotificationWorkerConfig();
  return { url, key };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { error?: string; errors?: string[] };
    throw new Error(
      err.error || err.errors?.join("; ") || `Worker SMS request failed (${res.status})`,
    );
  }
  return data as T;
}

/** Send now — worker processes immediately. */
export async function sendSms(args: SendArgs): Promise<WorkerSmsSendResult> {
  return post<WorkerSmsSendResult>("/api/v1/sms/send", {
    body: args.body,
    recipients: args.recipients,
    idempotencyKey: args.idempotencyKey,
  });
}

/** Schedule for later — worker cron sends at sendAt. */
export async function scheduleSms(args: ScheduleArgs): Promise<WorkerSmsSendResult> {
  return post<WorkerSmsSendResult>("/api/v1/sms/schedule", {
    body: args.body,
    recipients: args.recipients,
    sendAt: args.sendAt,
    idempotencyKey: args.idempotencyKey,
  });
}

export async function getSmsJobReport(jobId: string): Promise<SmsJobReport | null> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/sms/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    jobId?: string;
    status?: string;
    sendAt?: string | null;
    sentAt?: string | null;
    sent?: number;
    failed?: number;
    error?: string | null;
    tracking?: Partial<SmsJobTracking>;
  } | null;

  if (!data) return null;

  const tracking = data.tracking ?? {};
  const sent = data.sent ?? tracking.sent ?? 0;
  const failed = data.failed ?? tracking.failed ?? 0;

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    sent,
    failed,
    error: data.error ?? null,
    tracking: {
      total: tracking.total ?? sent + failed,
      sent,
      failed,
      invalid: tracking.invalid ?? 0,
      bounced: tracking.bounced ?? 0,
      delivered: tracking.delivered ?? 0,
    },
  };
}

/** @deprecated Use getSmsJobReport */
export async function getSmsJobStatus(jobId: string) {
  const report = await getSmsJobReport(jobId);
  if (!report) return null;
  return {
    jobId: report.jobId,
    status: report.status,
    sendAt: report.sendAt,
    sentAt: report.sentAt,
    sent: report.sent,
    failed: report.failed,
  };
}

/** Cancel a pending/scheduled SMS job in the worker. */
export async function cancelSmsJob(jobId: string): Promise<boolean> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/sms/jobs/${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return res.ok;
}
