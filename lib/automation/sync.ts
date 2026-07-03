import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AutomationDelivery } from "@/lib/supabase/types";
import { getJobReport, type RecipientRow } from "@/lib/worker/email";
import { getSmsJobReport } from "@/lib/worker/sms";

function isOpened(row: RecipientRow): boolean {
  return row.opened || row.status === "opened" || Boolean(row.openedAt);
}

function isBounced(row: RecipientRow): boolean {
  return row.status === "bounced";
}

function isFailed(row: RecipientRow): boolean {
  return row.status === "failed" || isBounced(row) || Boolean(row.error);
}

export function canResendToRecipient(row: RecipientRow): boolean {
  if (isFailed(row)) return false;
  if (!row.sentAt) return false;
  return !isOpened(row);
}

type DeliveryRow = Pick<
  AutomationDelivery,
  "id" | "worker_job_id" | "channel" | "status"
>;

export async function syncAutomationDelivery(
  delivery: DeliveryRow,
): Promise<boolean> {
  if (!delivery.worker_job_id) return false;

  const supabase = getAdminClient();
  const now = new Date().toISOString();

  if (delivery.channel === "sms") {
    const report = await getSmsJobReport(delivery.worker_job_id);
    if (!report) return false;

    const recipientStatus =
      report.failed > 0 && report.sent === 0
        ? "failed"
        : report.sent > 0
          ? "sent"
          : report.status;

    await supabase
      .from("automation_deliveries")
      .update({
        recipient_status: recipientStatus,
        last_synced_at: now,
        ...(report.status === "sent" && delivery.status === "scheduled"
          ? { status: "sent" }
          : {}),
      })
      .eq("id", delivery.id);
    return true;
  }

  const report = await getJobReport(delivery.worker_job_id);
  if (!report) return false;

  const row = report.recipients[0];
  if (!row) {
    await supabase
      .from("automation_deliveries")
      .update({ last_synced_at: now })
      .eq("id", delivery.id);
    return true;
  }

  const workerStatus = report.status;
  let deliveryStatus = delivery.status;
  if (workerStatus === "sent" || workerStatus === "partial") {
    deliveryStatus = "sent";
  } else if (workerStatus === "failed" && delivery.status !== "canceled") {
    deliveryStatus = "failed";
  } else if (workerStatus === "canceled") {
    deliveryStatus = "canceled";
  } else if (workerStatus === "pending" && delivery.status === "scheduled") {
    deliveryStatus = "scheduled";
  }

  await supabase
    .from("automation_deliveries")
    .update({
      status: deliveryStatus,
      recipient_status: row.status,
      opened_at: row.openedAt,
      delivered_at: row.deliveredAt,
      last_synced_at: now,
      error: row.error,
    })
    .eq("id", delivery.id);

  return true;
}

export async function syncAutomationDeliveries(
  automationId: string,
): Promise<{ synced: number; total: number }> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, worker_job_id, channel, status")
    .eq("automation_id", automationId)
    .not("worker_job_id", "is", null)
    .in("status", ["sent", "scheduled", "failed"]);

  const rows = (data as DeliveryRow[]) ?? [];
  let synced = 0;
  for (const row of rows) {
    try {
      if (await syncAutomationDelivery(row)) synced += 1;
    } catch {
      /* continue */
    }
  }
  return { synced, total: rows.length };
}

export function aggregateAutomationStats(
  deliveries: AutomationDelivery[],
): import("@/lib/supabase/types").AutomationStats {
  let sent_count = 0;
  let scheduled_count = 0;
  let failed_count = 0;
  let opened_count = 0;
  let delivered_count = 0;
  let bounced_count = 0;
  let not_opened_count = 0;
  let clicked_count = 0;
  let unique_clickers_count = 0;
  let total_clicks = 0;
  let last_synced_at: string | null = null;

  for (const d of deliveries) {
    if (d.last_synced_at) {
      if (!last_synced_at || d.last_synced_at > last_synced_at) {
        last_synced_at = d.last_synced_at;
      }
    }

    if (d.status === "scheduled") scheduled_count += 1;
    if (d.status === "failed") failed_count += 1;
    if (d.status !== "sent") continue;

    sent_count += 1;

    const bounced =
      d.recipient_status === "bounced" || d.recipient_status === "complained";
    const opened = Boolean(d.opened_at) || d.recipient_status === "opened";
    const delivered =
      Boolean(d.delivered_at) ||
      d.recipient_status === "delivered" ||
      d.recipient_status === "opened" ||
      opened;

    if (bounced) bounced_count += 1;
    if (delivered) delivered_count += 1;
    if (opened) opened_count += 1;
    if (!opened && !bounced && d.recipient_status !== "failed") {
      not_opened_count += 1;
    }
    const clicks = d.click_count ?? 0;
    if (clicks > 0) {
      unique_clickers_count += 1;
      total_clicks += clicks;
    }
  }

  clicked_count = unique_clickers_count;

  return {
    sent_count,
    scheduled_count,
    failed_count,
    opened_count,
    delivered_count,
    bounced_count,
    not_opened_count,
    clicked_count,
    unique_clickers_count,
    total_clicks,
    last_synced_at,
  };
}
