import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  getPersonEmailHistory,
  type PersonEmailItem,
} from "@/lib/admin/email-history";
import { fetchAllRows } from "@/lib/admin/stats-shared";

export type EngagementTier = "hot" | "warm" | "cold" | "none";

export type EmailEngagementSummary = {
  emailsSent: number;
  emailsScheduled: number;
  emailsFailed: number;
  emailsOpened: number;
  emailsWithClicks: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
  tier: EngagementTier;
};

export type EngagementActivityItem = {
  kind: "automation" | "campaign";
  title: string;
  sentAt: string;
  opened: boolean;
  openedAt: string | null;
  clicks: number;
};

export type ClickEventItem = {
  sourceType: "campaign" | "automation";
  sourceTitle: string;
  linkLabel: string | null;
  targetUrl: string | null;
  clickedAt: string;
};

function rate(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function engagementTier(summary: {
  emailsSent: number;
  emailsOpened: number;
  totalClicks: number;
  openRate: number;
}): EngagementTier {
  if (summary.emailsSent === 0) return "none";
  if (summary.openRate >= 50 && summary.totalClicks >= 2) return "hot";
  if (summary.openRate >= 35 || summary.totalClicks >= 1) return "warm";
  if (summary.emailsOpened > 0) return "cold";
  return "none";
}

type Acc = {
  emailsSent: number;
  emailsOpened: number;
  emailsWithClicks: number;
  totalClicks: number;
  scheduled: number;
  failed: number;
};

function bumpAcc(acc: Acc, opened: boolean, clicks: number) {
  acc.emailsSent += 1;
  if (opened) acc.emailsOpened += 1;
  if (clicks > 0) {
    acc.emailsWithClicks += 1;
    acc.totalClicks += clicks;
  }
}

function accToSummary(acc: Acc): EmailEngagementSummary {
  const openRate = rate(acc.emailsOpened, acc.emailsSent);
  const clickRate = rate(acc.emailsWithClicks, acc.emailsSent);
  return {
    emailsSent: acc.emailsSent,
    emailsScheduled: acc.scheduled,
    emailsFailed: acc.failed,
    emailsOpened: acc.emailsOpened,
    emailsWithClicks: acc.emailsWithClicks,
    totalClicks: acc.totalClicks,
    openRate,
    clickRate,
    tier: engagementTier({
      emailsSent: acc.emailsSent,
      emailsOpened: acc.emailsOpened,
      totalClicks: acc.totalClicks,
      openRate,
    }),
  };
}

function isOpenedRow(row: {
  opened_at: string | null;
  recipient_status: string | null;
}): boolean {
  return Boolean(row.opened_at) || row.recipient_status === "opened";
}

type DeliveryStatRow = {
  email: string;
  status: string;
  opened_at: string | null;
  click_count: number;
  recipient_status: string | null;
};

/** Keeps the `in()` filter inside PostgREST's URL limit. */
const EMAIL_CHUNK = 150;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function getEngagementSummaryForEmails(
  emails: string[],
): Promise<Map<string, EmailEngagementSummary>> {
  const map = new Map<string, EmailEngagementSummary>();
  if (emails.length === 0) return map;

  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  const byEmail = new Map<string, Acc>();
  for (const email of normalized) {
    byEmail.set(email, {
      emailsSent: 0,
      emailsOpened: 0,
      emailsWithClicks: 0,
      totalClicks: 0,
      scheduled: 0,
      failed: 0,
    });
  }

  const supabase = getAdminClient();

  function apply(rows: DeliveryStatRow[]) {
    for (const row of rows) {
      const acc = byEmail.get(row.email.toLowerCase());
      if (!acc) continue;
      if (row.status === "sent") {
        bumpAcc(acc, isOpenedRow(row), row.click_count ?? 0);
      } else if (row.status === "scheduled") {
        acc.scheduled += 1;
      } else if (row.status === "failed") {
        acc.failed += 1;
      }
    }
  }

  for (const batch of chunk(normalized, EMAIL_CHUNK)) {
    // Paginated: PostgREST caps a response at 1000 rows and a busy list of
    // subscribers has far more deliveries than that.
    const [autoRows, campRows] = await Promise.all([
      fetchAllRows<DeliveryStatRow>((from, to) =>
        supabase
          .from("automation_deliveries")
          .select("email, status, opened_at, click_count, recipient_status")
          .eq("channel", "email")
          .in("email", batch)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows<DeliveryStatRow>((from, to) =>
        supabase
          .from("campaign_deliveries")
          .select("email, status, opened_at, click_count, recipient_status")
          .in("email", batch)
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);

    apply(autoRows);
    apply(campRows);
  }

  for (const [email, acc] of byEmail) {
    map.set(email, accToSummary(acc));
  }

  return map;
}

async function resolveSourceTitle(
  sourceType: "campaign" | "automation",
  sourceId: string,
): Promise<string> {
  const supabase = getAdminClient();
  if (sourceType === "campaign") {
    const { data } = await supabase
      .from("email_campaigns")
      .select("subject")
      .eq("id", sourceId)
      .maybeSingle();
    return (data as { subject?: string } | null)?.subject ?? sourceId;
  }
  const { data } = await supabase
    .from("automations")
    .select("name")
    .eq("id", sourceId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name ?? sourceId;
}

export async function getClickEventsForEmail(
  email: string,
  limit = 30,
): Promise<ClickEventItem[]> {
  const normalized = email.trim().toLowerCase();
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("email_link_clicks")
    .select("source_type, source_id, link_label, target_url, clicked_at")
    .eq("email", normalized)
    .order("clicked_at", { ascending: false })
    .limit(limit);

  const events: ClickEventItem[] = [];
  for (const row of (data as {
    source_type: "campaign" | "automation";
    source_id: string;
    link_label: string | null;
    target_url: string | null;
    clicked_at: string;
  }[] | null) ?? []) {
    events.push({
      sourceType: row.source_type,
      sourceTitle: await resolveSourceTitle(row.source_type, row.source_id),
      linkLabel: row.link_label,
      targetUrl: row.target_url,
      clickedAt: row.clicked_at,
    });
  }
  return events;
}

export async function getSubscriberEngagementDetail(email: string): Promise<{
  summary: EmailEngagementSummary;
  emails: PersonEmailItem[];
  activity: EngagementActivityItem[];
  clickEvents: ClickEventItem[];
}> {
  const normalized = email.trim().toLowerCase();
  const [summaryMap, emails, clickEvents] = await Promise.all([
    getEngagementSummaryForEmails([normalized]),
    getPersonEmailHistory(normalized),
    getClickEventsForEmail(normalized),
  ]);
  const summary = summaryMap.get(normalized) ?? accToSummary({
    emailsSent: 0,
    emailsOpened: 0,
    emailsWithClicks: 0,
    totalClicks: 0,
    scheduled: 0,
    failed: 0,
  });

  const activity: EngagementActivityItem[] = emails
    .filter((item) => item.status === "sent")
    .map((item) => ({
      kind: item.kind === "reminder" ? "automation" : item.kind,
      title: item.title,
      sentAt: item.at,
      opened: item.opened,
      openedAt: item.openedAt,
      clicks: item.clicks,
    }));

  return { summary, emails, activity, clickEvents };
}
