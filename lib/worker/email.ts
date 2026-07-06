import "server-only";

import {
  getNotificationWorkerConfig,
  requireNotificationWorkerConfig,
} from "@/lib/worker/config";

/**
 * Email adapter for notification-worker (ZeptoMail under the hood).
 *
 * Env: see lib/worker/config.ts (NOTIFICATION_WORKER_*)
 */

type SendArgs = {
  subject: string;
  html: string;
  recipients: string[];
  from?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    url: string;
    contentType: string;
  }[];
};

type ScheduleArgs = SendArgs & {
  sendAt: string; // ISO
  idempotencyKey?: string;
};

export type WorkerSendResult = {
  jobId: string;
  status: string;
  sent?: number;
  failed?: number;
  sendAt?: string;
};

export type JobTracking = {
  total: number;
  opened: number;
  notOpened: number;
  sent: number;
  failed: number;
};

export type JobStatus = {
  jobId: string;
  status: string; // pending | processing | sent | failed | canceled
  sendAt: string | null;
  sentAt: string | null;
  tracking: JobTracking;
};

export type RecipientRow = {
  email: string;
  status: string;
  opened: boolean;
  openedAt: string | null;
  deliveredAt: string | null;
  sentAt: string | null;
  error: string | null;
};

export type RecipientStats = {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  delivered: number;
  opened: number;
  notOpened: number;
  pending: number;
};

export type JobReport = {
  jobId: string;
  status: string;
  sendAt: string | null;
  sentAt: string | null;
  recipients: RecipientRow[];
  tracking: RecipientStats;
  notOpenedEmails: string[];
};

function isBounced(r: RecipientRow): boolean {
  return r.status === "bounced";
}

function isFailedRecipient(r: RecipientRow): boolean {
  return r.status === "failed" || isBounced(r) || Boolean(r.error);
}

function isOpened(r: RecipientRow): boolean {
  return r.opened || r.status === "opened" || Boolean(r.openedAt);
}

/** Only successfully delivered, non-opened addresses — never bounced/failed. */
function canResendTo(r: RecipientRow): boolean {
  if (isFailedRecipient(r)) return false;
  if (!r.sentAt) return false;
  return !isOpened(r);
}

export function notOpenedRecipientEmails(recipients: RecipientRow[]): string[] {
  return recipients.filter(canResendTo).map((r) => r.email);
}

function isDelivered(r: RecipientRow): boolean {
  return Boolean(r.deliveredAt) || r.status === "delivered" || r.status === "opened";
}

/** Per-recipient breakdown — bounced/failed are excluded from not-opened counts. */
export function summarizeRecipients(recipients: RecipientRow[]): RecipientStats {
  let bounced = 0;
  let failed = 0;
  let delivered = 0;
  let opened = 0;
  let notOpened = 0;
  let pending = 0;
  let sent = 0;

  for (const r of recipients) {
    if (isBounced(r)) {
      bounced += 1;
      continue;
    }
    if (r.status === "failed" || (r.error && r.status !== "sent" && r.status !== "opened")) {
      failed += 1;
      continue;
    }
    if (r.status === "pending" || !r.sentAt) {
      pending += 1;
      continue;
    }

    sent += 1;
    if (isDelivered(r)) delivered += 1;
    if (isOpened(r)) {
      opened += 1;
    } else {
      notOpened += 1;
    }
  }

  return {
    total: recipients.length,
    sent,
    failed,
    bounced,
    delivered,
    opened,
    notOpened,
    pending,
  };
}

function getConfig() {
  const { url, key, from } = requireNotificationWorkerConfig();
  return { url, key, from };
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
    throw new Error(
      (data as { error?: string }).error || `Worker request failed (${res.status})`,
    );
  }
  return data as T;
}

export async function sendEmail(args: SendArgs): Promise<WorkerSendResult> {
  const { from, replyTo } = getNotificationWorkerConfig();
  return post<WorkerSendResult>("/api/v1/send", {
    subject: args.subject,
    html: args.html,
    recipients: args.recipients,
    from: args.from || from,
    replyTo: args.replyTo || replyTo,
    attachments: args.attachments?.length ? args.attachments : undefined,
  });
}

export async function scheduleEmail(args: ScheduleArgs): Promise<WorkerSendResult> {
  const { from, replyTo } = getNotificationWorkerConfig();
  return post<WorkerSendResult>("/api/v1/schedule", {
    subject: args.subject,
    html: args.html,
    recipients: args.recipients,
    from: args.from || from,
    replyTo: args.replyTo || replyTo,
    sendAt: args.sendAt,
    idempotencyKey: args.idempotencyKey,
    attachments: args.attachments?.length ? args.attachments : undefined,
  });
}

const EMPTY_TRACKING: JobTracking = {
  total: 0,
  opened: 0,
  notOpened: 0,
  sent: 0,
  failed: 0,
};

/** Full, authoritative status from the worker (status + tracking + dates). */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    jobId?: string;
    status?: string;
    sendAt?: string | null;
    sentAt?: string | null;
    tracking?: Partial<JobTracking>;
  } | null;
  if (!data) return null;

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    tracking: { ...EMPTY_TRACKING, ...(data.tracking ?? {}) },
  };
}

export async function getJobTracking(jobId: string): Promise<JobTracking | null> {
  const status = await getJobStatus(jobId);
  return status?.tracking ?? null;
}

/** Per-recipient report — tracking counts come from the worker (authoritative). */
export async function getJobReport(jobId: string): Promise<JobReport | null> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}?recipients=true`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    jobId?: string;
    status?: string;
    sendAt?: string | null;
    sentAt?: string | null;
    recipients?: RecipientRow[];
    tracking?: Partial<JobTracking>;
  } | null;
  if (!data) return null;

  const recipients = data.recipients ?? [];
  const tracking = summarizeRecipients(recipients);
  const notOpenedEmails = recipients.filter(canResendTo).map((r) => r.email);

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    recipients,
    tracking: {
      ...tracking,
      notOpened: notOpenedEmails.length,
    },
    notOpenedEmails,
  };
}

export async function getNotOpenedEmails(jobId: string): Promise<string[]> {
  const report = await getJobReport(jobId);
  return report?.notOpenedEmails ?? [];
}

/** Cancel a pending/scheduled email job in the worker. */
export async function cancelEmailJob(jobId: string): Promise<boolean> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return res.ok;
}
