import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getAutomationDeliveries } from "@/lib/admin/automations-data";
import { aggregateAutomationStats } from "@/lib/automation/sync";
import { dayKey, fetchAllRows, rate } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";
import type { AutomationChannel, AutomationDelivery } from "@/lib/supabase/types";
import {
  countRecipients,
  type AutomationLinkRow,
  type AutomationRecipientLink,
  type AutomationRecipientRow,
  type AutomationRecipientState,
  type AutomationReport,
  type AutomationTimePoint,
} from "@/lib/admin/automation-report";

type ClickRow = {
  email: string;
  target_url: string | null;
  link_label: string | null;
  clicked_at: string;
};

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  status: "subscribed" | "unsubscribed";
};

/** A daily chart over years is unreadable — show the tail. */
const MAX_TIMELINE_DAYS = 120;

function isBounced(d: AutomationDelivery): boolean {
  return d.recipient_status === "bounced" || d.recipient_status === "complained";
}

function isOpened(d: AutomationDelivery): boolean {
  return Boolean(d.opened_at) || d.recipient_status === "opened";
}

function isDelivered(d: AutomationDelivery): boolean {
  return (
    Boolean(d.delivered_at) ||
    d.recipient_status === "delivered" ||
    d.recipient_status === "clicked" ||
    isOpened(d)
  );
}

function isFailed(d: AutomationDelivery): boolean {
  return d.status === "failed" || d.recipient_status === "failed";
}

/** The rule the resend action uses, so the chip count matches the button. */
function isNotOpened(d: AutomationDelivery): boolean {
  return (
    d.status === "sent" &&
    !d.opened_at &&
    d.recipient_status !== "bounced" &&
    d.recipient_status !== "opened" &&
    d.recipient_status !== "failed" &&
    d.recipient_status !== "complained"
  );
}

function recipientState(
  d: AutomationDelivery,
  clicks: number,
): AutomationRecipientState {
  if (d.status === "scheduled") return "scheduled";
  if (d.status === "canceled") return "canceled";
  if (d.status === "skipped") return "skipped";
  if (isFailed(d)) return "failed";
  if (isBounced(d)) return "bounced";
  if (clicks > 0) return "clicked";
  if (isOpened(d)) return "opened";
  if (isDelivered(d)) return "delivered";
  return "sent";
}

function linkKey(label: string, url: string): string {
  return `${label}::${url}`;
}

/**
 * Clicks are recorded per address, not per delivery — the tracker credits the
 * newest live delivery for that address. Mirror that here, so a re-triggered
 * automation shows the link detail on one row instead of on every row.
 */
function pickClickDeliveryIds(
  deliveries: AutomationDelivery[],
): Map<string, string> {
  const byEmail = new Map<string, AutomationDelivery[]>();
  for (const d of deliveries) {
    const email = d.email.trim().toLowerCase();
    const list = byEmail.get(email) ?? [];
    list.push(d);
    byEmail.set(email, list);
  }

  const newest = (list: AutomationDelivery[]) =>
    [...list].sort((a, b) => b.sent_at.localeCompare(a.sent_at))[0];

  const chosen = new Map<string, string>();
  for (const [email, rows] of byEmail) {
    const counted = rows.filter((d) => (d.click_count ?? 0) > 0);
    const sent = rows.filter((d) => d.status === "sent");
    const pick = newest(
      counted.length > 0 ? counted : sent.length > 0 ? sent : rows,
    );
    if (pick) chosen.set(email, pick.id);
  }
  return chosen;
}

function buildTimeline(
  deliveries: AutomationDelivery[],
  clicks: ClickRow[],
): AutomationTimePoint[] {
  const buckets = new Map<string, { sent: number; opened: number; clicks: number }>();
  const bucket = (key: string) => {
    const existing = buckets.get(key);
    if (existing) return existing;
    const created = { sent: 0, opened: 0, clicks: 0 };
    buckets.set(key, created);
    return created;
  };

  for (const d of deliveries) {
    if (d.status === "sent") {
      const key = dayKey(d.sent_at);
      if (key) bucket(key).sent += 1;
    }
    if (d.opened_at) {
      const key = dayKey(d.opened_at);
      if (key) bucket(key).opened += 1;
    }
  }
  for (const click of clicks) {
    const key = dayKey(click.clicked_at);
    if (key) bucket(key).clicks += 1;
  }

  const days = [...buckets.keys()].sort();
  if (days.length === 0) return [];

  // Fill the gaps so a quiet week reads as a flat line, not a missing one.
  const filled: string[] = [];
  const cursor = new Date(`${days[0]}T12:00:00Z`);
  const end = new Date(`${days[days.length - 1]}T12:00:00Z`);
  for (let i = 0; i < 800 && cursor <= end; i++) {
    filled.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return filled.slice(-MAX_TIMELINE_DAYS).map((date) => ({
    date,
    ...(buckets.get(date) ?? { sent: 0, opened: 0, clicks: 0 }),
  }));
}

async function loadSubscribers(
  emails: string[],
): Promise<Map<string, SubscriberRow>> {
  const supabase = getAdminClient();
  const map = new Map<string, SubscriberRow>();
  if (emails.length === 0) return map;

  // Chunked: one `.in()` with thousands of addresses blows the URL length limit.
  for (const batch of chunkArray(emails, 200)) {
    const { data } = await supabase
      .from("subscribers")
      .select("id, email, name, status")
      .in("email", batch);
    for (const row of (data as SubscriberRow[] | null) ?? []) {
      map.set(row.email.trim().toLowerCase(), row);
    }
  }
  return map;
}

export async function getAutomationReport(
  automationId: string,
  channel: AutomationChannel = "email",
): Promise<AutomationReport> {
  const supabase = getAdminClient();
  const deliveries = await getAutomationDeliveries(automationId);

  const emails = [
    ...new Set(
      deliveries.map((d) => d.email.trim().toLowerCase()).filter(Boolean),
    ),
  ];

  const [clicks, subscribers] = await Promise.all([
    channel === "sms"
      ? Promise.resolve([] as ClickRow[])
      : // `clicked_at` repeats within a burst — `id` keeps the pages stable.
        fetchAllRows<ClickRow>((from, to) =>
          supabase
            .from("email_link_clicks")
            .select("email, target_url, link_label, clicked_at")
            .eq("source_type", "automation")
            .eq("source_id", automationId)
            .order("clicked_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),
    loadSubscribers(emails),
  ]);

  const clicksByEmail = new Map<string, Map<string, AutomationRecipientLink>>();
  const clickTimesByEmail = new Map<string, { first: string; last: string }>();
  const linkTotals = new Map<
    string,
    { label: string; url: string; clicks: number; emails: Set<string> }
  >();

  for (const click of clicks) {
    const email = click.email.trim().toLowerCase();
    const url = click.target_url?.trim() || "—";
    const label = click.link_label?.trim() || url;
    const key = linkKey(label, url);

    const perEmail =
      clicksByEmail.get(email) ?? new Map<string, AutomationRecipientLink>();
    const entry = perEmail.get(key) ?? {
      label,
      url,
      clicks: 0,
      lastClickedAt: click.clicked_at,
    };
    entry.clicks += 1;
    if (click.clicked_at > entry.lastClickedAt) {
      entry.lastClickedAt = click.clicked_at;
    }
    perEmail.set(key, entry);
    clicksByEmail.set(email, perEmail);

    const times = clickTimesByEmail.get(email);
    if (!times) {
      clickTimesByEmail.set(email, {
        first: click.clicked_at,
        last: click.clicked_at,
      });
    } else {
      if (click.clicked_at < times.first) times.first = click.clicked_at;
      if (click.clicked_at > times.last) times.last = click.clicked_at;
    }

    const total = linkTotals.get(key) ?? {
      label,
      url,
      clicks: 0,
      emails: new Set<string>(),
    };
    total.clicks += 1;
    total.emails.add(email);
    linkTotals.set(key, total);
  }

  const clickDeliveryByEmail = pickClickDeliveryIds(deliveries);

  const recipients: AutomationRecipientRow[] = deliveries.map((d) => {
    const email = d.email.trim().toLowerCase();
    const sub = subscribers.get(email);
    const ownsClicks = clickDeliveryByEmail.get(email) === d.id;
    const links = ownsClicks
      ? [...(clicksByEmail.get(email)?.values() ?? [])].sort(
          (a, b) => b.clicks - a.clicks,
        )
      : [];
    const times = ownsClicks ? clickTimesByEmail.get(email) : undefined;
    // The stored counter stays the source of truth; the click log adds detail
    // and covers rows written before the counter existed.
    const clicks =
      (d.click_count ?? 0) > 0
        ? d.click_count
        : links.reduce((sum, link) => sum + link.clicks, 0);

    return {
      id: d.id,
      email: d.email,
      phone: d.phone,
      name: sub?.name ?? null,
      subscriberId: sub?.id ?? d.subscriber_id ?? null,
      subscriberStatus: sub?.status ?? null,
      status: d.status,
      recipientStatus: d.recipient_status,
      state: recipientState(d, clicks),
      delivered: isDelivered(d),
      opened: isOpened(d),
      bounced: isBounced(d),
      failed: isFailed(d),
      notOpened: isNotOpened(d),
      scheduledFor: d.scheduled_for,
      sentAt: d.sent_at,
      deliveredAt: d.delivered_at,
      openedAt: d.opened_at,
      clicks,
      firstClickedAt: d.first_clicked_at ?? times?.first ?? null,
      lastClickedAt: times?.last ?? d.first_clicked_at ?? null,
      error: d.error,
      links,
    };
  });

  const stats = aggregateAutomationStats(deliveries);

  const unsubscribed = new Set(
    recipients
      .filter((r) => r.subscriberStatus === "unsubscribed")
      .map((r) => r.email.toLowerCase()),
  ).size;

  const sentDates = deliveries
    .filter((d) => d.status === "sent")
    .map((d) => d.sent_at)
    .sort();

  const activity = [
    ...deliveries.map((d) => d.opened_at).filter((v): v is string => Boolean(v)),
    ...clicks.map((c) => c.clicked_at),
  ].sort();

  const links: AutomationLinkRow[] = [...linkTotals.values()]
    .map((entry) => ({
      label: entry.label,
      url: entry.url,
      clicks: entry.clicks,
      uniqueClickers: entry.emails.size,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.uniqueClickers - a.uniqueClickers);

  return {
    automationId,
    channel,
    totals: {
      recipients: emails.length,
      sent: stats.sent_count,
      scheduled: stats.scheduled_count,
      delivered: stats.delivered_count,
      opened: stats.opened_count,
      notOpened: stats.not_opened_count,
      clicked: stats.unique_clickers_count,
      totalClicks: stats.total_clicks,
      bounced: stats.bounced_count,
      failed: stats.failed_count,
      canceled: deliveries.filter((d) => d.status === "canceled").length,
      skipped: deliveries.filter((d) => d.status === "skipped").length,
      unsubscribed,
      deliveryRate: rate(stats.delivered_count, stats.sent_count),
      openRate: rate(stats.opened_count, stats.sent_count),
      clickRate: rate(stats.unique_clickers_count, stats.sent_count),
      ctor: rate(stats.unique_clickers_count, stats.opened_count),
      bounceRate: rate(stats.bounced_count, stats.sent_count),
    },
    counts: countRecipients(recipients),
    recipients,
    links,
    timeline: buildTimeline(deliveries, clicks),
    firstSentAt: sentDates[0] ?? null,
    lastSentAt: sentDates[sentDates.length - 1] ?? null,
    lastActivityAt: activity[activity.length - 1] ?? null,
    lastSyncedAt: stats.last_synced_at,
  };
}
