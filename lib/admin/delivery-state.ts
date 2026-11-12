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
