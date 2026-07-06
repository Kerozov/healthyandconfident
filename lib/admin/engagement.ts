import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export type EngagementTier = "hot" | "warm" | "cold" | "none";

export type EmailEngagementSummary = {
  emailsSent: number;
  emailsOpened: number;
  emailsWithClicks: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
  tier: EngagementTier;
};

export type SubscriberEngagementRow = EmailEngagementSummary & {
  email: string;
  subscriberId: string | null;
  name: string | null;
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

export type TopLinkRow = {
  linkLabel: string;
  targetUrl: string;
  clicks: number;
  uniqueEmails: number;
};

export type EngagementOverview = {
  totals: EmailEngagementSummary;
  topByOpens: SubscriberEngagementRow[];
  topByClicks: SubscriberEngagementRow[];
  topLinks: TopLinkRow[];
  recentClicks: {
    email: string;
    sourceType: "campaign" | "automation";
    sourceTitle: string;
    linkLabel: string | null;
    targetUrl: string | null;
    clickedAt: string;
  }[];
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

function rowToSubscriber(
  email: string,
  acc: Acc,
  subMap: Map<string, { id: string; name: string | null }>,
): SubscriberEngagementRow {
  return {
    email,
    subscriberId: subMap.get(email)?.id ?? null,
    name: subMap.get(email)?.name ?? null,
    ...accToSummary(acc),
  };
}

export async function getEngagementSummaryForEmails(
  emails: string[],
): Promise<Map<string, EmailEngagementSummary>> {
  const map = new Map<string, EmailEngagementSummary>();
  if (emails.length === 0) return map;

  const normalized = emails.map((e) => e.trim().toLowerCase());
  const byEmail = new Map<string, Acc>();
  for (const email of normalized) {
    byEmail.set(email, {
      emailsSent: 0,
      emailsOpened: 0,
      emailsWithClicks: 0,
      totalClicks: 0,
    });
  }

  const supabase = getAdminClient();

  const { data: autoRows } = await supabase
    .from("automation_deliveries")
    .select("email, opened_at, click_count, recipient_status")
    .eq("channel", "email")
    .eq("status", "sent")
    .in("email", normalized);

  for (const row of (autoRows as {
    email: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
  }[] | null) ?? []) {
    const acc = byEmail.get(row.email.toLowerCase());
    if (!acc) continue;
    bumpAcc(acc, isOpenedRow(row), row.click_count ?? 0);
  }

  const { data: campRows } = await supabase
    .from("campaign_deliveries")
    .select("email, opened_at, click_count, recipient_status")
    .eq("status", "sent")
    .in("email", normalized);

  for (const row of (campRows as {
    email: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
  }[] | null) ?? []) {
    const acc = byEmail.get(row.email.toLowerCase());
    if (!acc) continue;
    bumpAcc(acc, isOpenedRow(row), row.click_count ?? 0);
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
  activity: EngagementActivityItem[];
  clickEvents: ClickEventItem[];
}> {
  const normalized = email.trim().toLowerCase();
  const summaryMap = await getEngagementSummaryForEmails([normalized]);
  const summary = summaryMap.get(normalized) ?? accToSummary({
    emailsSent: 0,
    emailsOpened: 0,
    emailsWithClicks: 0,
    totalClicks: 0,
  });

  const supabase = getAdminClient();
  const activity: EngagementActivityItem[] = [];

  const { data: autoDeliveries } = await supabase
    .from("automation_deliveries")
    .select("automation_id, sent_at, opened_at, click_count, recipient_status, automations(name)")
    .eq("email", normalized)
    .eq("channel", "email")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(50);

  for (const row of (autoDeliveries as {
    automation_id: string;
    sent_at: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
    automations: { name: string } | { name: string }[] | null;
  }[] | null) ?? []) {
    const auto = Array.isArray(row.automations)
      ? row.automations[0]
      : row.automations;
    activity.push({
      kind: "automation",
      title: auto?.name ?? row.automation_id,
      sentAt: row.sent_at,
      opened: isOpenedRow(row),
      openedAt: row.opened_at,
      clicks: row.click_count ?? 0,
    });
  }

  const { data: campDeliveries } = await supabase
    .from("campaign_deliveries")
    .select("campaign_id, sent_at, opened_at, click_count, recipient_status, email_campaigns(subject)")
    .eq("email", normalized)
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(50);

  for (const row of (campDeliveries as {
    campaign_id: string;
    sent_at: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
    email_campaigns: { subject: string } | { subject: string }[] | null;
  }[] | null) ?? []) {
    const camp = Array.isArray(row.email_campaigns)
      ? row.email_campaigns[0]
      : row.email_campaigns;
    activity.push({
      kind: "campaign",
      title: camp?.subject ?? row.campaign_id,
      sentAt: row.sent_at,
      opened: isOpenedRow(row),
      openedAt: row.opened_at,
      clicks: row.click_count ?? 0,
    });
  }

  activity.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );

  const clickEvents = await getClickEventsForEmail(normalized);

  return { summary, activity: activity.slice(0, 40), clickEvents };
}

async function aggregateTopLinks(): Promise<TopLinkRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("email_link_clicks")
    .select("link_label, target_url, email");

  const map = new Map<
    string,
    { linkLabel: string; targetUrl: string; clicks: number; emails: Set<string> }
  >();

  for (const row of (data as {
    link_label: string | null;
    target_url: string | null;
    email: string;
  }[] | null) ?? []) {
    const targetUrl = row.target_url?.trim() || "—";
    const linkLabel = row.link_label?.trim() || targetUrl;
    const key = `${linkLabel}::${targetUrl}`;
    const entry = map.get(key) ?? {
      linkLabel,
      targetUrl,
      clicks: 0,
      emails: new Set<string>(),
    };
    entry.clicks += 1;
    entry.emails.add(row.email.toLowerCase());
    map.set(key, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      linkLabel: entry.linkLabel,
      targetUrl: entry.targetUrl,
      clicks: entry.clicks,
      uniqueEmails: entry.emails.size,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.uniqueEmails - a.uniqueEmails)
    .slice(0, 15);
}

export async function getEngagementOverview(): Promise<EngagementOverview> {
  const supabase = getAdminClient();
  const byEmail = new Map<string, Acc>();

  const { data: autoRows } = await supabase
    .from("automation_deliveries")
    .select("email, opened_at, click_count, recipient_status")
    .eq("channel", "email")
    .eq("status", "sent");

  for (const row of (autoRows as {
    email: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
  }[] | null) ?? []) {
    const key = row.email.toLowerCase();
    const acc = byEmail.get(key) ?? {
      emailsSent: 0,
      emailsOpened: 0,
      emailsWithClicks: 0,
      totalClicks: 0,
    };
    bumpAcc(acc, isOpenedRow(row), row.click_count ?? 0);
    byEmail.set(key, acc);
  }

  const { data: campRows } = await supabase
    .from("campaign_deliveries")
    .select("email, opened_at, click_count, recipient_status")
    .eq("status", "sent");

  for (const row of (campRows as {
    email: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
  }[] | null) ?? []) {
    const key = row.email.toLowerCase();
    const acc = byEmail.get(key) ?? {
      emailsSent: 0,
      emailsOpened: 0,
      emailsWithClicks: 0,
      totalClicks: 0,
    };
    bumpAcc(acc, isOpenedRow(row), row.click_count ?? 0);
    byEmail.set(key, acc);
  }

  const totalsAcc: Acc = {
    emailsSent: 0,
    emailsOpened: 0,
    emailsWithClicks: 0,
    totalClicks: 0,
  };
  for (const acc of byEmail.values()) {
    totalsAcc.emailsSent += acc.emailsSent;
    totalsAcc.emailsOpened += acc.emailsOpened;
    totalsAcc.emailsWithClicks += acc.emailsWithClicks;
    totalsAcc.totalClicks += acc.totalClicks;
  }

  const emails = [...byEmail.keys()];
  const { data: subs } = await supabase
    .from("subscribers")
    .select("id, email, name")
    .in("email", emails.length ? emails : ["__none__"]);

  const subMap = new Map(
    ((subs as { id: string; email: string; name: string | null }[] | null) ?? []).map(
      (s) => [s.email.toLowerCase(), s],
    ),
  );

  const allRows = [...byEmail.entries()].map(([email, acc]) =>
    rowToSubscriber(email, acc, subMap),
  );

  const topByOpens = [...allRows]
    .sort(
      (a, b) =>
        b.emailsOpened - a.emailsOpened ||
        b.openRate - a.openRate ||
        b.totalClicks - a.totalClicks,
    )
    .slice(0, 15);

  const topByClicks = [...allRows]
    .sort(
      (a, b) =>
        b.totalClicks - a.totalClicks ||
        b.emailsOpened - a.emailsOpened ||
        b.openRate - a.openRate,
    )
    .slice(0, 15);

  const { data: recentClickRows } = await supabase
    .from("email_link_clicks")
    .select("email, source_type, source_id, link_label, target_url, clicked_at")
    .order("clicked_at", { ascending: false })
    .limit(25);

  const recentClicks: EngagementOverview["recentClicks"] = [];
  for (const row of (recentClickRows as {
    email: string;
    source_type: "campaign" | "automation";
    source_id: string;
    link_label: string | null;
    target_url: string | null;
    clicked_at: string;
  }[] | null) ?? []) {
    recentClicks.push({
      email: row.email,
      sourceType: row.source_type,
      sourceTitle: await resolveSourceTitle(row.source_type, row.source_id),
      linkLabel: row.link_label,
      targetUrl: row.target_url,
      clickedAt: row.clicked_at,
    });
  }

  const topLinks = await aggregateTopLinks();

  return {
    totals: accToSummary(totalsAcc),
    topByOpens,
    topByClicks,
    topLinks,
    recentClicks,
  };
}
