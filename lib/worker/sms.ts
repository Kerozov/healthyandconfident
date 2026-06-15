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
};

export type SmsJobStatus = {
  jobId: string;
  status: string;
  sendAt: string | null;
  sentAt: string | null;
  sent: number;
  failed: number;
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

export async function getSmsJobStatus(jobId: string): Promise<SmsJobStatus | null> {
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
  } | null;

  if (!data) return null;

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    sent: data.sent ?? 0,
    failed: data.failed ?? 0,
  };
}
