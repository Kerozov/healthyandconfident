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
  opened: number;
  notOpened: number;
  sent: number;
  failed: number;
};

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

export async function getJobTracking(jobId: string): Promise<JobTracking | null> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as
    | { tracking?: JobTracking }
    | null;
  return data?.tracking ?? null;
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
