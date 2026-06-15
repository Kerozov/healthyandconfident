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
    opened: number; // confirmed (human) opens only
    machineOpened: number; // instant / prefetch opens that are filtered out
    notOpened: number;
  };
  notOpenedEmails: string[]; // confirmed non-openers (for resend)
};

/**
 * Minimum seconds between send and open for an open to count as a real human
 * open. Faster opens are almost always Apple Mail Privacy Protection, Gmail's
 * image proxy, or antivirus/link scanners pre-loading the tracking pixel.
 */
const OPEN_CONFIRM_SECONDS = Number(process.env.OPEN_CONFIRM_SECONDS ?? 12);

function isConfirmedOpen(r: RecipientRow): boolean {
  if (!r.opened || !r.openedAt) return false;
  if (!r.sentAt) return true; // no baseline to compare → trust it
  const delaySec =
    (new Date(r.openedAt).getTime() - new Date(r.sentAt).getTime()) / 1000;
  return delaySec >= OPEN_CONFIRM_SECONDS;
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

/**
 * Authoritative per-recipient report with machine-open filtering applied.
 * This is what the admin uses for accurate open counts + resend targeting.
 */
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
  } | null;
  if (!data) return null;

  const recipients = data.recipients ?? [];

  let failed = 0;
  let opened = 0;
  let machineOpened = 0;
  const notOpenedEmails: string[] = [];

  for (const r of recipients) {
    const isFailed =
      r.status === "failed" || r.status === "bounced" || Boolean(r.error);
    if (isFailed) {
      failed += 1;
      continue;
    }
    if (isConfirmedOpen(r)) {
      opened += 1;
    } else {
      if (r.opened) machineOpened += 1; // opened pixel, but too fast = machine
      notOpenedEmails.push(r.email);
    }
  }

  const sent = recipients.length - failed;

  return {
    jobId: data.jobId ?? jobId,
    status: data.status ?? "unknown",
    sendAt: data.sendAt ?? null,
    sentAt: data.sentAt ?? null,
    recipients,
    tracking: {
      total: recipients.length,
      sent,
      failed,
      opened,
      machineOpened,
      notOpened: notOpenedEmails.length,
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
