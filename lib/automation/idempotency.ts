import "server-only";

/** Stable per subscriber — new signup after delete gets a new subscriber id → fresh worker job. */
export function automationJobIdempotencyKey(
  automationId: string,
  ctx: { email: string; subscriberId?: string | null },
): string {
  const recipient = ctx.subscriberId?.trim() || ctx.email.trim().toLowerCase();
  return `auto-${automationId}-${recipient}`;
}

export function automationIdFromIdempotencyKey(key: string | undefined): string | null {
  if (!key?.startsWith("auto-")) return null;
  const rest = key.slice(5);
  if (rest.length < 38 || rest[36] !== "-") return null;
  const automationId = rest.slice(0, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      automationId,
    )
  ) {
    return null;
  }
  return automationId;
}

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

/** Map worker job status → automation_deliveries status. */
export function deliveryStatusFromWorkerResult(
  item: WorkerBatchResultItem,
): "sent" | "scheduled" | "failed" {
  if (item.error) return "failed";
  if (item.status === "canceled" || item.status === "failed") return "failed";

  const isSent =
    item.status === "sent" ||
    item.dispatch === "immediate" ||
    (item.sent ?? 0) > 0;
  if (isSent) return "sent";

  if (
    item.status === "pending" ||
    item.status === "scheduled" ||
    item.status === "processing"
  ) {
    return "scheduled";
  }

  return "failed";
}
