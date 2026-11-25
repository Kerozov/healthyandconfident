import "server-only";

import {
  getNotificationWorkerConfig,
  requireNotificationWorkerConfig,
  workerCancelSucceeded,
} from "@/lib/worker/config";
import { cdnUrl, rewriteStorageUrls } from "@/lib/storage/cdn-url";

/**
 * Email adapter for notification-worker (ZeptoMail under the hood).
 *
 * Env: see lib/worker/config.ts (NOTIFICATION_WORKER_*)
 */

/**
 * Last stop before the worker: any Storage URL still pointing at Supabase
 * (old content, a pasted link) goes out as the cached `/files` URL instead.
 * Each email open and each per-job attachment fetch would otherwise be paid
 * out of the Supabase egress quota.
 */
function withCdnUrls<T extends { url: string }>(attachments: T[]): T[] {
  return attachments.map((att) => ({ ...att, url: cdnUrl(att.url) }));
}

type SendArgs = {
  subject: string;
  html: string;
  recipients: string[];
  from?: string;
  replyTo?: string;
  idempotencyKey?: string;
  /** Optional caller deadline; omitted for existing campaign/automation sends. */
  signal?: AbortSignal;
  merge?: Record<string, Record<string, string>>;
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

export type WorkerBatchJobItem = {
  subject: string;
  html: string;
  recipients: string[];
  sendAt: string;
  idempotencyKey?: string;
  attachments?: SendArgs["attachments"];
  /** Per recipient; `unsubscribe_url` there becomes the List-Unsubscribe headers. */
  merge?: SendArgs["merge"];
};

export type WorkerBatchResultItem = {
  idempotencyKey?: string;
  jobId: string;
  status: string;
  sendAt: string;
  dispatch?: string;
  sent?: number;
  failed?: number;
  error?: string;
};

export type WorkerBatchResult = {
  ok: boolean;
  results: WorkerBatchResultItem[];
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

/**
 * `sent` = went out to the mail server = `delivered` + `bounced`. ZeptoMail
 * sends no "delivered" events, so delivered means "did not come back".
 */
export type RecipientStats = {
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  delivered: number;
  opened: number;
  notOpened: number;
  pending: number;
  /** Removed from the job before it went out — not a failure. */
  canceled: number;
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
  // The worker marks a click as "clicked" even when the open pixel was blocked.
  return r.opened || r.status === "opened" || r.status === "clicked" || Boolean(r.openedAt);
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

type RecipientOutcome = "delivered" | "bounced" | "failed" | "pending" | "canceled";

/**
 * The worker's status decides, not `error`: a removed address ("Removed from
 * job"), a bounce and an address queued again after a temporary bounce all
 * carry a note there. Reading any note as a failure counted 3,199 removed
 * addresses of a cancelled campaign as failed.
 */
export function recipientOutcome(r: RecipientRow): RecipientOutcome {
  switch (r.status) {
    case "canceled":
      return "canceled";
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    case "bounced":
    case "complained":
      return "bounced";
    case "sent":
    case "delivered":
    case "opened":
    case "clicked":
      return r.sentAt || isOpened(r) ? "delivered" : "pending";
  }
  if (r.error) return "failed";
  return r.sentAt ? "delivered" : "pending";
}

/** Per-recipient breakdown — bounced/failed are excluded from not-opened counts. */
export function summarizeRecipients(recipients: RecipientRow[]): RecipientStats {
  const stats: RecipientStats = {
    total: recipients.length,
    sent: 0,
    failed: 0,
    bounced: 0,
    delivered: 0,
    opened: 0,
    notOpened: 0,
    pending: 0,
    canceled: 0,
  };

  for (const r of recipients) {
    const outcome = recipientOutcome(r);
    if (outcome === "delivered" || outcome === "bounced") {
      stats.sent += 1;
      if (outcome === "bounced") {
        stats.bounced += 1;
        continue;
      }
      stats.delivered += 1;
      if (isOpened(r)) stats.opened += 1;
      else stats.notOpened += 1;
      continue;
    }
    stats[outcome] += 1;
  }

  return stats;
}

function getConfig() {
  const { url, key, from } = requireNotificationWorkerConfig();
  return { url, key, from };
}

/**
 * `retry` is only safe when the worker can recognise the repeat — i.e. every
 * job carries an idempotency key. A timed-out send without one may already
 * have gone out, and a blind retry mails the recipient twice.
 */
async function post<T>(
  path: string,
  body: unknown,
  opts: { retry: boolean; signal?: AbortSignal },
): Promise<T> {
  const { url, key } = getConfig();
  let lastError: Error | null = null;
  const attempts = opts.retry ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    opts.signal?.throwIfAborted();
    let res: Response;
    try {
      res = await fetch(`${url}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: opts.signal,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Worker request failed");
      if (attempt < attempts - 1) continue;
      throw lastError;
    }

    const data = await res.json().catch(() => ({}));
    opts.signal?.throwIfAborted();
    if (res.ok) {
      return data as T;
    }
    lastError = new Error(
      (data as { error?: string }).error || `Worker request failed (${res.status})`,
    );
    if (attempt < attempts - 1 && (res.status === 429 || res.status >= 500)) continue;
    throw lastError;
  }

  throw lastError ?? new Error("Worker request failed");
}

export async function lookupEmailJob(
  idempotencyKey: string,
): Promise<WorkerSendResult | null> {
  const lookupKey = idempotencyKey.trim();
  if (!lookupKey) return null;

  const { url, key } = getConfig();
  try {
    const res = await fetch(
      `${url}/api/v1/jobs/lookup?key=${encodeURIComponent(lookupKey)}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      jobId?: string;
      status?: string;
      sent?: number;
      failed?: number;
    } | null;
    if (!data?.jobId) return null;
    return {
      jobId: data.jobId,
      status: data.status ?? "pending",
      sent: data.sent,
      failed: data.failed,
    };
  } catch {
    return null;
  }
}

export async function sendEmail(args: SendArgs): Promise<WorkerSendResult> {
  const { from, replyTo } = getNotificationWorkerConfig();
  return post<WorkerSendResult>(
    "/api/v1/send",
    {
      subject: args.subject,
      html: rewriteStorageUrls(args.html),
      recipients: args.recipients,
      from: args.from || from,
      replyTo: args.replyTo || replyTo,
      attachments: args.attachments?.length ? withCdnUrls(args.attachments) : undefined,
      idempotencyKey: args.idempotencyKey,
      merge: args.merge && Object.keys(args.merge).length > 0 ? args.merge : undefined,
    },
    { retry: Boolean(args.idempotencyKey), signal: args.signal },
  );
}

/** One HTTP call — worker creates/schedules all jobs (immediate + delayed). */
export async function submitEmailJobsBatch(
  jobs: WorkerBatchJobItem[],
): Promise<WorkerBatchResult> {
  if (jobs.length === 0) {
    return { ok: true, results: [] };
  }
  const { from, replyTo } = getNotificationWorkerConfig();
  return post<WorkerBatchResult>(
    "/api/v1/jobs/batch",
    {
      from,
      replyTo,
      jobs: jobs.map((job) => ({
        subject: job.subject,
        html: rewriteStorageUrls(job.html),
        recipients: job.recipients,
        sendAt: job.sendAt,
        idempotencyKey: job.idempotencyKey,
        // Must ride along: this is the path automations actually take, so dropping
        // it sent lead-magnet emails with no PDF while the single-job fallback
        // attached one.
        attachments: job.attachments?.length ? withCdnUrls(job.attachments) : undefined,
        merge: job.merge && Object.keys(job.merge).length > 0 ? job.merge : undefined,
      })),
    },
    { retry: jobs.every((job) => Boolean(job.idempotencyKey)) },
  );
}

export async function scheduleEmail(args: ScheduleArgs): Promise<WorkerSendResult> {
  const { from, replyTo } = getNotificationWorkerConfig();
  return post<WorkerSendResult>(
    "/api/v1/schedule",
    {
      subject: args.subject,
      html: rewriteStorageUrls(args.html),
      recipients: args.recipients,
      from: args.from || from,
      replyTo: args.replyTo || replyTo,
      sendAt: args.sendAt,
      idempotencyKey: args.idempotencyKey,
      attachments: args.attachments?.length ? withCdnUrls(args.attachments) : undefined,
      merge: args.merge && Object.keys(args.merge).length > 0 ? args.merge : undefined,
    },
    { retry: Boolean(args.idempotencyKey), signal: args.signal },
  );
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
export async function getJobReport(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobReport | null> {
  const { url, key } = getConfig();
  const res = await fetch(`${url}/api/v1/jobs/${jobId}?recipients=true`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: signal && AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
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
  return workerCancelSucceeded(res);
}

/**
 * Take addresses out of a pending job without touching anyone else in it.
 *
 * A campaign is ONE worker job for the whole audience, so `cancelEmailJob` on
 * it stops the send for everybody — which is what one person unsubscribing
 * used to do to a scheduled campaign.
 *
 * `true` also when there is nothing left to remove: the worker answers 404/409
 * for a job that is gone or already sent, and the address is out of reach.
 */
export async function removeEmailJobRecipients(
  jobId: string,
  emails: string[],
): Promise<boolean> {
  const list = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!jobId || list.length === 0) return true;

  const { url, key } = getConfig();
  try {
    const res = await fetch(
      `${url}/api/v1/jobs/${encodeURIComponent(jobId)}/recipients/remove`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emails: list }),
        cache: "no-store",
      },
    );
    return res.ok || res.status === 404 || res.status === 409;
  } catch {
    return false;
  }
}

export type ReplaceRecipientResult =
  | "replaced"
  | "unchanged"
  /** That part of the job is sending or sent — it goes to the old address. */
  | "not_pending"
  | "not_in_job"
  | "not_found"
  | "error";

/**
 * Swap one address of a pending job for another (the person changed their
 * email). A campaign is ONE job for its whole audience, so this is the only
 * way to move one person without touching everyone else. `merge` carries the
 * new address's own fields — `{{email}}` and its unsubscribe link.
 */
export async function replaceEmailJobRecipient(
  jobId: string,
  from: string,
  to: string,
  merge?: Record<string, string>,
): Promise<ReplaceRecipientResult> {
  if (!jobId) return "not_found";
  const { url, key } = getConfig();
  try {
    const res = await fetch(
      `${url}/api/v1/jobs/${encodeURIComponent(jobId)}/recipients/replace`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, merge }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (res.status === 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      // An older worker without this route answers a bare 404 page.
      return data.error === "Job not found" ? "not_found" : "error";
    }
    const data = (await res.json().catch(() => ({}))) as { outcome?: string };
    const outcome = data.outcome;
    if (
      outcome === "replaced" ||
      outcome === "unchanged" ||
      outcome === "not_pending" ||
      outcome === "not_in_job"
    ) {
      return outcome;
    }
    return "error";
  } catch {
    return "error";
  }
}

const BULK_CANCEL_MAX = 200;

/**
 * Cancel many pending jobs in as few calls as possible (the worker takes 200
 * per request). `canceled` holds the jobs the worker actually stopped; a job
 * that is missing from both sets was no longer pending (already sent or
 * cancelled earlier).
 */
export async function cancelEmailJobsBulk(
  jobIds: string[],
): Promise<{ canceled: Set<string>; failed: Set<string> }> {
  const unique = [...new Set(jobIds.map((id) => id.trim()).filter(Boolean))];
  const canceled = new Set<string>();
  const failed = new Set<string>();
  if (unique.length === 0) return { canceled, failed };

  const { url, key } = getConfig();
  for (let i = 0; i < unique.length; i += BULK_CANCEL_MAX) {
    const chunk = unique.slice(i, i + BULK_CANCEL_MAX);
    try {
      const res = await fetch(`${url}/api/v1/jobs/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobIds: chunk }),
        cache: "no-store",
      });
      if (!res.ok) {
        for (const id of chunk) failed.add(id);
        continue;
      }
      const data = (await res.json().catch(() => ({}))) as { jobIds?: string[] };
      for (const id of data.jobIds ?? []) canceled.add(id);
    } catch {
      for (const id of chunk) failed.add(id);
    }
  }
  return { canceled, failed };
}
