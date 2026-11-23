import "server-only";

import { syncCampaignDeliveries } from "@/lib/campaign/sync-deliveries";
import { getAdminClient } from "@/lib/supabase/admin";
import type { CampaignStatus, SmsCampaignStatus } from "@/lib/supabase/types";
import { getJobReport, type JobReport } from "@/lib/worker/email";
import { getSmsJobReport } from "@/lib/worker/sms";

type SyncResult = { ok: boolean; message?: string };

/** Map worker job status + counts to our campaign status. */
export function deriveCampaignStatus(
  workerStatus: string,
  counts: { sent: number; failed: number; total: number },
  scheduled: boolean,
): CampaignStatus {
  switch (workerStatus) {
    case "pending":
      return scheduled ? "scheduled" : "queued";
    case "processing":
      return "sending";
    case "canceled":
      return "canceled";
    case "failed":
      return "failed";
    case "sent":
    default:
      if (counts.failed > 0 && counts.sent > 0) return "partial";
      if (counts.sent === 0 && counts.failed > 0) return "failed";
      return "sent";
  }
}

export function parseWorkerJobIds(workerJobId: string | null | undefined): string[] {
  return (workerJobId ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}

function mergeJobReports(reports: JobReport[]) {
  const tracking = reports.reduce(
    (acc, report) => ({
      total: acc.total + report.tracking.total,
      sent: acc.sent + report.tracking.sent,
      failed: acc.failed + report.tracking.failed,
      bounced: acc.bounced + report.tracking.bounced,
      delivered: acc.delivered + report.tracking.delivered,
      opened: acc.opened + report.tracking.opened,
      notOpened: acc.notOpened + report.tracking.notOpened,
      pending: acc.pending + report.tracking.pending,
      canceled: acc.canceled + report.tracking.canceled,
    }),
    {
      total: 0,
      sent: 0,
      failed: 0,
      bounced: 0,
      delivered: 0,
      opened: 0,
      notOpened: 0,
      pending: 0,
      canceled: 0,
    },
  );

  const status = reports.every((report) => report.status === "pending")
    ? "pending"
    : reports.some((report) => report.status === "processing" || report.status === "pending")
      ? "processing"
      : reports.every((report) => report.status === "canceled")
        ? "canceled"
        : reports.every((report) => report.status === "failed")
          ? "failed"
          : "sent";

  return {
    status,
    sentAt: reports.find((report) => report.sentAt)?.sentAt ?? null,
    tracking,
    recipients: reports.flatMap((report) => report.recipients),
  };
}

export async function aggregateJobReports(jobIds: string[]) {
  const reports = (await Promise.all(jobIds.map((id) => getJobReport(id)))).filter(
    (report) => report !== null,
  );
  return reports.length ? mergeJobReports(reports) : null;
}

export async function persistCampaignSync(
  id: string,
  workerJobId: string,
  scheduledAt: string | null,
  recipientsCount: number,
  {
    signal,
    expectedStatus,
    refreshClicks,
  }: { signal?: AbortSignal; expectedStatus?: CampaignStatus; refreshClicks?: boolean } = {},
): Promise<SyncResult> {
  const syncedAt = new Date().toISOString();
  const jobIds = parseWorkerJobIds(workerJobId);
  const jobReports = await Promise.all(
    jobIds.map((jobId) => getJobReport(jobId, signal).catch(() => null)),
  );
  const reports = jobReports.filter((report) => report !== null);
  // Older campaigns can reference several jobs. An incomplete report would overwrite valid totals.
  if (
    !reports.length ||
    reports.length !== jobIds.length ||
    reports.some((report) => report.status === "unknown")
  ) {
    return { ok: false, message: "Could not reach the worker for this job." };
  }

  const report = reports.length === 1 ? reports[0] : mergeJobReports(reports);
  const t = report.tracking;
  // `sent` includes bounces; a campaign where every address bounced failed.
  const status = deriveCampaignStatus(
    report.status,
    { sent: t.delivered, failed: t.failed + t.bounced, total: t.total },
    Boolean(scheduledAt),
  );

  try {
    await syncCampaignDeliveries(id, {
      reports: new Map(jobIds.map((jobId, index) => [jobId, reports[index]])),
      syncedAt,
      signal,
      refreshClicks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save delivery stats.";
    return { ok: false, message };
  }

  const query = getAdminClient()
    .from("email_campaigns")
    .update({
      status,
      sent_count: t.sent,
      failed_count: t.failed,
      bounced_count: t.bounced,
      delivered_count: t.delivered,
      opened_count: t.opened,
      not_opened_count: t.notOpened,
      total_count: t.total || recipientsCount,
      sent_at: report.sentAt,
      last_synced_at: syncedAt,
    })
    .eq("id", id)
    .eq("worker_job_id", workerJobId)
    .or(`last_synced_at.is.null,last_synced_at.lte.${syncedAt}`);
  if (expectedStatus) query.eq("status", expectedStatus);
  if (signal) query.abortSignal(signal);
  const { error } = await query;
  return error ? { ok: false, message: error.message } : { ok: true };
}

function deriveSmsCampaignStatus(
  workerStatus: string,
  counts: { sent: number; failed: number; total: number },
  scheduled: boolean,
): SmsCampaignStatus {
  switch (workerStatus) {
    case "pending":
      return scheduled ? "scheduled" : "queued";
    case "processing":
      return "sending";
    case "canceled":
      return "canceled";
    case "failed":
      return "failed";
    case "sent":
    case "partial":
    default:
      if (counts.failed > 0 && counts.sent > 0) return "partial";
      if (counts.sent === 0 && counts.failed > 0) return "failed";
      if (counts.sent > 0) return "sent";
      return scheduled ? "scheduled" : "queued";
  }
}

export async function persistSmsCampaignSync(
  id: string,
  workerJobId: string,
  scheduledAt: string | null,
  recipientsCount: number,
  { signal, expectedStatus }: { signal?: AbortSignal; expectedStatus?: SmsCampaignStatus } = {},
): Promise<SyncResult & { status?: SmsCampaignStatus; sent?: number; failed?: number }> {
  const report = workerJobId ? await getSmsJobReport(workerJobId, signal).catch(() => null) : null;
  if (!report || report.status === "unknown") {
    return { ok: false, message: "Could not reach the worker for this SMS job." };
  }

  const t = report.tracking;
  const failedTotal = t.failed + t.invalid;
  const status = deriveSmsCampaignStatus(
    report.status,
    { sent: t.sent, failed: failedTotal, total: t.total || recipientsCount },
    Boolean(scheduledAt) && report.status === "pending",
  );

  const query = getAdminClient()
    .from("sms_campaigns")
    .update({
      status,
      sent_count: t.sent,
      failed_count: failedTotal,
      sent_at: report.sentAt,
      error: report.error,
    })
    .eq("id", id)
    .eq("provider_ref", workerJobId);
  if (expectedStatus) query.eq("status", expectedStatus);
  if (signal) query.abortSignal(signal);
  const { error } = await query;
  if (error) return { ok: false, message: error.message };
  return { ok: true, status, sent: t.sent, failed: failedTotal };
}
