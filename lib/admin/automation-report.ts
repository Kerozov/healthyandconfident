/**
 * Shapes and pure helpers for the per-automation report.
 *
 * Kept free of `server-only` so the admin panel can import the types and the
 * filter predicates — the client filters an already-loaded report instead of
 * round-tripping to the server on every chip click.
 */
import type { AutomationChannel, AutomationDelivery } from "@/lib/supabase/types";

/** One exclusive label per recipient — what the badge in the table shows. */
export type AutomationRecipientState =
  | "clicked"
  | "opened"
  | "delivered"
  | "sent"
  | "scheduled"
  | "bounced"
  | "failed"
  | "canceled"
  | "skipped";

export type AutomationRecipientLink = {
  label: string;
  url: string;
  clicks: number;
  lastClickedAt: string;
};

export type AutomationRecipientRow = {
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  subscriberId: string | null;
  /** List status today — an unsubscribe after the send is worth seeing. */
  subscriberStatus: "subscribed" | "unsubscribed" | null;
  status: AutomationDelivery["status"];
  recipientStatus: string | null;
  state: AutomationRecipientState;
  delivered: boolean;
  opened: boolean;
  bounced: boolean;
  failed: boolean;
  /** Sent, not bounced, not opened — the resend audience. */
  notOpened: boolean;
  scheduledFor: string | null;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clicks: number;
  firstClickedAt: string | null;
  lastClickedAt: string | null;
  error: string | null;
  links: AutomationRecipientLink[];
};

export type AutomationLinkRow = {
  label: string;
  url: string;
  clicks: number;
  uniqueClickers: number;
};

export type AutomationReportTotals = {
  /** Unique addresses touched, across every delivery attempt. */
  recipients: number;
  sent: number;
  scheduled: number;
  delivered: number;
  opened: number;
  notOpened: number;
  clicked: number;
  totalClicks: number;
  bounced: number;
  failed: number;
  canceled: number;
  skipped: number;
  /** Recipients who have since left the list. */
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  /** Click-to-open — how compelling the content was for those who opened. */
  ctor: number;
  bounceRate: number;
};

export type AutomationTimePoint = {
  date: string;
  sent: number;
  opened: number;
  clicks: number;
};

export type AutomationReport = {
  automationId: string;
  channel: AutomationChannel;
  totals: AutomationReportTotals;
  counts: Record<AutomationRecipientFilter, number>;
  recipients: AutomationRecipientRow[];
  links: AutomationLinkRow[];
  timeline: AutomationTimePoint[];
  firstSentAt: string | null;
  lastSentAt: string | null;
  /** Newest open or click — "has anything happened lately?". */
  lastActivityAt: string | null;
  lastSyncedAt: string | null;
};

export type AutomationRecipientFilter =
  | "all"
  | "sent"
  | "delivered"
  | "opened"
  | "not_opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "scheduled";

export const RECIPIENT_FILTERS: AutomationRecipientFilter[] = [
  "all",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "not_opened",
  "bounced",
  "failed",
  "scheduled",
];

export const RECIPIENT_FILTER_LABELS: Record<AutomationRecipientFilter, string> = {
  all: "Всички",
  sent: "Изпратени",
  delivered: "Доставени",
  opened: "Отворили",
  not_opened: "Неотворили",
  clicked: "Кликнали",
  bounced: "Върнати",
  failed: "Грешка",
  scheduled: "Насрочени",
};

export const RECIPIENT_STATE_LABELS: Record<AutomationRecipientState, string> = {
  clicked: "кликнал",
  opened: "отворил",
  delivered: "доставен",
  sent: "изпратен",
  scheduled: "насрочен",
  bounced: "върнат",
  failed: "грешка",
  canceled: "отказан",
  skipped: "пропуснат",
};

export function matchesRecipientFilter(
  row: AutomationRecipientRow,
  filter: AutomationRecipientFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "sent":
      return row.status === "sent";
    case "delivered":
      return row.status === "sent" && row.delivered;
    case "opened":
      return row.opened;
    case "not_opened":
      return row.notOpened;
    case "clicked":
      return row.clicks > 0;
    case "bounced":
      return row.bounced;
    case "failed":
      return row.failed;
    case "scheduled":
      return row.status === "scheduled";
  }
}

export function countRecipients(
  rows: AutomationRecipientRow[],
): Record<AutomationRecipientFilter, number> {
  const counts = Object.fromEntries(
    RECIPIENT_FILTERS.map((f) => [f, 0]),
  ) as Record<AutomationRecipientFilter, number>;

  for (const row of rows) {
    for (const filter of RECIPIENT_FILTERS) {
      if (matchesRecipientFilter(row, filter)) counts[filter] += 1;
    }
  }
  return counts;
}

/** Name + e-mail, or just the e-mail — used by search and by the CSV export. */
export function recipientSearchText(row: AutomationRecipientRow): string {
  return `${row.name ?? ""} ${row.email} ${row.phone ?? ""}`.toLowerCase();
}
