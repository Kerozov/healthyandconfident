import "server-only";

/**
 * Adapter for the multi-tenant notification-worker (ZeptoMail under the hood).
 * Docs: D:\notification-worker\README.md
 *
 * Env:
 *   EMAIL_WORKER_URL       e.g. https://notification-worker-phi.vercel.app
 *   EMAIL_WORKER_API_KEY   tenant Bearer key (e.g. hc_xxxxxxxx)
 *   EMAIL_WORKER_FROM      "Vessie Ney <vessie@healthyandconfident.co.uk>"
 *   EMAIL_WORKER_REPLY_TO  optional
 */

type SendArgs = {
  subject: string;
  html: string;
  recipients: string[];
  from?: string;
  replyTo?: string;
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

export type JobReport = {
  jobId: string;
  status: string;
  sendAt: string | null;
  sentAt: string | null;
  recipients: RecipientRow[];
  tracking: {
    total: number;
    sent: number;
    failed: number;
    opened: number;
    notOpened: number;
  };
  notOpenedEmails: string[];
};

function isFailedRecipient(r: RecipientRow): boolean {
  return r.status === "failed" || r.status === "bounced" || Boolean(r.error);
}

function getConfig() {
  const url = process.env.EMAIL_WORKER_URL;
  const key = process.env.EMAIL_WORKER_API_KEY?.trim();
  const from = process.env.EMAIL_WORKER_FROM;
  if (!url || !key) {
    throw new Error(
      "EMAIL_WORKER_URL and EMAIL_WORKER_API_KEY are required to send email.",
    );
  }
  return { url: url.replace(/\/$/, ""), key, from };
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
  const { from } = getConfig();
  return post<WorkerSendResult>("/api/v1/send", {
    subject: args.subject,
    html: args.html,
    recipients: args.recipients,
    from: args.from || from,
    replyTo: args.replyTo || process.env.EMAIL_WORKER_REPLY_TO,
  });
}

export async function scheduleEmail(args: ScheduleArgs): Promise<WorkerSendResult> {
  const { from } = getConfig();
  return post<WorkerSendResult>("/api/v1/schedule", {
    subject: args.subject,
    html: args.html,
    recipients: args.recipients,
    from: args.from || from,
    replyTo: args.replyTo || process.env.EMAIL_WORKER_REPLY_TO,
    sendAt: args.sendAt,
    idempotencyKey: args.idempotencyKey,
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
  const workerTracking = { ...EMPTY_TRACKING, ...(data.tracking ?? {}) };
  const notOpenedEmails = recipients
    .filter((r) => !isFailedRecipient(r) && !r.opened)
    .map((r) => r.email);

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    recipients,
    tracking: {
      total: workerTracking.total || recipients.length,
      sent: workerTracking.sent,
      failed: workerTracking.failed,
      opened: workerTracking.opened,
      notOpened: workerTracking.notOpened || notOpenedEmails.length,
    },
    notOpenedEmails,
  };
}

export async function getNotOpenedEmails(jobId: string): Promise<string[]> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}?notOpened=true`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as
    | { notOpenedEmails?: string[] }
    | null;
  return data?.notOpenedEmails ?? [];
}

export function isEmailWorkerConfigured() {
  return Boolean(process.env.EMAIL_WORKER_URL && process.env.EMAIL_WORKER_API_KEY);
}
