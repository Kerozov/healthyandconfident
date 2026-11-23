/**
 * The site writes `status = "sent"` when it hands an email to the worker; the
 * worker's own state arrives later in `recipient_status`. While that still says
 * "pending", the email has not left — showing it as sent is what hid ten stuck
 * welcome emails on 12 Nov 2026.
 */
export const STUCK_AFTER_MS = 60 * 60 * 1000;

type Row = { status: string | null; recipient_status: string | null; sent_at?: string | null };

export function isAwaitingWorker(row: Row): boolean {
  return row.status === "sent" && row.recipient_status === "pending";
}

/** Waiting on the worker for over an hour: treat as a problem, not progress. */
export function isStuckAtWorker(row: Row, now = Date.now()): boolean {
  if (!isAwaitingWorker(row) || !row.sent_at) return false;
  const at = new Date(row.sent_at).getTime();
  return Number.isFinite(at) && now - at >= STUCK_AFTER_MS;
}

/** The worker saw a bounce or a spam report for this address. */
export function isBouncedRecipient(recipientStatus: string | null | undefined): boolean {
  return recipientStatus === "bounced" || recipientStatus === "complained";
}

/**
 * Where one delivery row ended up. Every report counts with this, so "sent",
 * "delivered" and "bounced" mean the same thing on every screen:
 *
 * - sent = went out to the mail server = delivered + bounced
 * - delivered = went out and did not come back
 *
 * ZeptoMail sends no "delivered" events (not one row had `delivered_at` by
 * 23 Nov 2026), so waiting for proof showed "delivered" below "opened".
 *
 * Rows synced before that date stored bounces and cancellations as status
 * "failed"; `recipient_status` still tells them apart.
 */
export type DeliveryOutcome =
  | "scheduled"
  | "waiting"
  | "delivered"
  | "bounced"
  | "failed"
  | "canceled"
  | "skipped";

type OutcomeRow = Row & {
  opened_at?: string | null;
  delivered_at?: string | null;
  click_count?: number | null;
};

export function deliveryOutcome(row: OutcomeRow): DeliveryOutcome | null {
  const rs = row.recipient_status ?? "";
  if (row.status === "canceled" || rs === "canceled") return "canceled";
  if (row.status === "scheduled") return "scheduled";
  if (row.status === "skipped") return "skipped";
  if (row.status === "failed") return isBouncedRecipient(rs) ? "bounced" : "failed";
  if (row.status !== "sent") return null;
  if (rs === "pending") return "waiting";
  if (rs === "failed") return "failed";
  const arrived =
    Boolean(row.opened_at || row.delivered_at) ||
    (row.click_count ?? 0) > 0 ||
    rs === "opened" ||
    rs === "clicked" ||
    rs === "delivered";
  if (isBouncedRecipient(rs) && !arrived) return "bounced";
  return "delivered";
}

/** Went out to the mail server — what "sent" counts. */
export function wentOut(outcome: DeliveryOutcome | null): boolean {
  return outcome === "delivered" || outcome === "bounced";
}
