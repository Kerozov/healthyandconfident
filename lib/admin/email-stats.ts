import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  dayKey,
  dayKeysInRange,
  emailDomain,
  fetchAllRows,
  hourOfDay,
  inRange,
  rate,
  statsRange,
  trend,
  weekdayIndex,
  type StatsPeriod,
  type StatsRange,
} from "@/lib/admin/stats-shared";
import { engagementTier, type EngagementTier } from "@/lib/admin/engagement";

export type EmailTotals = {
  sent: number;
  scheduled: number;
  failed: number;
  canceled: number;
  delivered: number;
  bounced: number;
  opened: number;
  /** Emails that got at least one click. */
  withClicks: number;
  totalClicks: number;
  uniqueRecipients: number;
  openRate: number;
  clickRate: number;
  /** Click-to-open — how compelling the content is for people who opened. */
  ctor: number;
  deliveryRate: number;
  bounceRate: number;
  failRate: number;
};

export type EmailTrends = {
  sent: number | null;
  opened: number | null;
  clicks: number | null;
  openRate: number | null;
};

export type EmailTimePoint = {
  date: string;
  sent: number;
  opened: number;
  clicks: number;
};

export type CampaignStatRow = {
  id: string;
  subject: string;
  status: string;
  sentAt: string | null;
  segment: string;
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  withClicks: number;
  totalClicks: number;
  failed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  ctor: number;
};

export type AutomationStatRow = {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  sent: number;
  scheduled: number;
  failed: number;
  opened: number;
  withClicks: number;
  totalClicks: number;
  openRate: number;
  clickRate: number;
  ctor: number;
};

export type LinkStatRow = {
  linkLabel: string;
  targetUrl: string;
  clicks: number;
  uniqueEmails: number;
};

export type DomainStatRow = {
  domain: string;
  recipients: number;
  sent: number;
  opened: number;
  openRate: number;
};

export type PersonStatRow = {
  email: string;
  name: string | null;
  subscriberId: string | null;
  sent: number;
  opened: number;
  clicks: number;
  openRate: number;
  tier: EngagementTier;
};

export type RecentClickRow = {
  email: string;
  sourceType: "campaign" | "automation";
  sourceTitle: string;
  linkLabel: string | null;
  targetUrl: string | null;
  clickedAt: string;
};

export type AudienceStats = {
  total: number;
  subscribed: number;
  unsubscribed: number;
  newInPeriod: number;
  /** Received ≥3 emails in the period and opened none. */
  inactive: number;
};

export type EmailStatsOverview = {
  period: StatsPeriod;
  range: StatsRange;
  totals: EmailTotals;
  previous: EmailTotals;
  trends: EmailTrends;
  timeline: EmailTimePoint[];
  campaigns: CampaignStatRow[];
  automations: AutomationStatRow[];
  topLinks: LinkStatRow[];
  domains: DomainStatRow[];
  opensByHour: { hour: number; opens: number }[];
  opensByWeekday: { weekday: number; opens: number }[];
  tiers: Record<EngagementTier, number>;
  topByOpens: PersonStatRow[];
  topByClicks: PersonStatRow[];
  inactive: PersonStatRow[];
  recentClicks: RecentClickRow[];
  audience: AudienceStats;
  sms: { sent: number; failed: number; scheduled: number };
};

type DeliveryRow = {
  kind: "campaign" | "automation";
  sourceId: string;
  email: string;
  status: string;
  recipientStatus: string | null;
  openedAt: string | null;
  deliveredAt: string | null;
  clicks: number;
  sentAt: string;
};

type Acc = {
  sent: number;
  scheduled: number;
  failed: number;
  canceled: number;
  delivered: number;
  bounced: number;
  opened: number;
  withClicks: number;
  totalClicks: number;
  recipients: Set<string>;
};

function newAcc(): Acc {
  return {
    sent: 0,
    scheduled: 0,
    failed: 0,
    canceled: 0,
    delivered: 0,
    bounced: 0,
    opened: 0,
    withClicks: 0,
    totalClicks: 0,
    recipients: new Set<string>(),
  };
}

function isOpened(row: DeliveryRow): boolean {
  return Boolean(row.openedAt) || row.recipientStatus === "opened";
}

function isDelivered(row: DeliveryRow): boolean {
  if (row.deliveredAt) return true;
  const status = row.recipientStatus ?? "";
  return status === "delivered" || status === "opened" || status === "clicked";
}

function isBounced(row: DeliveryRow): boolean {
  return (row.recipientStatus ?? "").includes("bounce");
}

function bump(acc: Acc, row: DeliveryRow) {
  if (row.status === "sent") {
    acc.sent += 1;
    acc.recipients.add(row.email);
    if (isDelivered(row)) acc.delivered += 1;
    if (isBounced(row)) acc.bounced += 1;
    if (isOpened(row)) acc.opened += 1;
    if (row.clicks > 0) {
      acc.withClicks += 1;
      acc.totalClicks += row.clicks;
    }
    return;
  }
  if (row.status === "scheduled") acc.scheduled += 1;
  else if (row.status === "failed") acc.failed += 1;
  else if (row.status === "canceled") acc.canceled += 1;
}

function toTotals(acc: Acc): EmailTotals {
  return {
    sent: acc.sent,
    scheduled: acc.scheduled,
    failed: acc.failed,
    canceled: acc.canceled,
    delivered: acc.delivered,
    bounced: acc.bounced,
    opened: acc.opened,
    withClicks: acc.withClicks,
    totalClicks: acc.totalClicks,
    uniqueRecipients: acc.recipients.size,
    openRate: rate(acc.opened, acc.sent),
    clickRate: rate(acc.withClicks, acc.sent),
    ctor: rate(acc.withClicks, acc.opened),
    deliveryRate: rate(acc.delivered, acc.sent),
    bounceRate: rate(acc.bounced, acc.sent),
    failRate: rate(acc.failed, acc.sent + acc.failed),
  };
}

function totalsFrom(rows: DeliveryRow[]): EmailTotals {
  const acc = newAcc();
  for (const row of rows) bump(acc, row);
  return toTotals(acc);
}

type CampaignRecord = {
  id: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  segment_tag: string;
  recipients_count: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  bounced_count: number;
  delivered_count: number;
};

type AutomationRecord = {
  id: string;
  name: string;
  trigger_event: string;
  channel: string;
  enabled: boolean;
};

async function loadDeliveries(since: string | null): Promise<{
  email: DeliveryRow[];
  sms: { status: string; sentAt: string }[];
}> {
  const supabase = getAdminClient();

  const campaignRows = await fetchAllRows<{
    campaign_id: string;
    email: string;
    status: string;
    recipient_status: string | null;
    opened_at: string | null;
    delivered_at: string | null;
    click_count: number | null;
    sent_at: string;
  }>((from, to) => {
    let q = supabase
      .from("campaign_deliveries")
      .select(
        "campaign_id, email, status, recipient_status, opened_at, delivered_at, click_count, sent_at",
      )
      .order("sent_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (since) q = q.gte("sent_at", since);
    return q;
  });

  const automationRows = await fetchAllRows<{
    automation_id: string;
    email: string;
    channel: string;
    status: string;
    recipient_status: string | null;
    opened_at: string | null;
    delivered_at: string | null;
    click_count: number | null;
    sent_at: string;
  }>((from, to) => {
    let q = supabase
      .from("automation_deliveries")
      .select(
        "automation_id, email, channel, status, recipient_status, opened_at, delivered_at, click_count, sent_at",
      )
      .order("sent_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (since) q = q.gte("sent_at", since);
    return q;
  });

  const email: DeliveryRow[] = [];
  const sms: { status: string; sentAt: string }[] = [];

  for (const row of campaignRows) {
    email.push({
      kind: "campaign",
      sourceId: row.campaign_id,
      email: row.email.toLowerCase(),
      status: row.status,
      recipientStatus: row.recipient_status,
      openedAt: row.opened_at,
      deliveredAt: row.delivered_at,
      clicks: row.click_count ?? 0,
      sentAt: row.sent_at,
    });
  }

  for (const row of automationRows) {
    if (row.channel === "sms") {
      sms.push({ status: row.status, sentAt: row.sent_at });
      continue;
    }
    email.push({
      kind: "automation",
      sourceId: row.automation_id,
      email: row.email.toLowerCase(),
      status: row.status,
      recipientStatus: row.recipient_status,
      openedAt: row.opened_at,
      deliveredAt: row.delivered_at,
      clicks: row.click_count ?? 0,
      sentAt: row.sent_at,
    });
  }

  return { email, sms };
}

function buildTimeline(
  range: StatsRange,
  rows: DeliveryRow[],
  clicks: { clicked_at: string }[],
): EmailTimePoint[] {
  const keys = dayKeysInRange(range);
  const index = new Map(keys.map((k) => [k, { sent: 0, opened: 0, clicks: 0 }]));

  for (const row of rows) {
    if (row.status === "sent") {
      const bucket = index.get(dayKey(row.sentAt));
      if (bucket) bucket.sent += 1;
    }
    if (row.openedAt && inRange(row.openedAt, range.since, range.until)) {
      const bucket = index.get(dayKey(row.openedAt));
      if (bucket) bucket.opened += 1;
    }
  }

  for (const click of clicks) {
    const bucket = index.get(dayKey(click.clicked_at));
    if (bucket) bucket.clicks += 1;
  }

  return keys.map((date) => ({ date, ...index.get(date)! }));
}

function buildCampaignRows(
  rows: DeliveryRow[],
  campaigns: CampaignRecord[],
  range: StatsRange,
): CampaignStatRow[] {
  const byCampaign = new Map<string, Acc>();
  for (const row of rows) {
    if (row.kind !== "campaign") continue;
    const acc = byCampaign.get(row.sourceId) ?? newAcc();
    bump(acc, row);
    byCampaign.set(row.sourceId, acc);
  }

  const out: CampaignStatRow[] = [];

  for (const campaign of campaigns) {
    const acc = byCampaign.get(campaign.id);
    // Without delivery rows the campaign's own date decides period membership.
    if (!acc && !inRange(campaign.sent_at ?? campaign.created_at, range.since, range.until)) {
      continue;
    }
    // Campaigns sent before per-recipient tracking only have worker counters.
    const totals = acc
      ? toTotals(acc)
      : toTotals({
          ...newAcc(),
          sent: campaign.sent_count,
          delivered: campaign.delivered_count,
          bounced: campaign.bounced_count,
          opened: campaign.opened_count,
          withClicks: campaign.clicked_count,
          totalClicks: campaign.clicked_count,
          failed: campaign.failed_count,
        });

    if (totals.sent === 0 && totals.failed === 0 && totals.scheduled === 0) continue;

    out.push({
      id: campaign.id,
      subject: campaign.subject,
      status: campaign.status,
      sentAt: campaign.sent_at ?? campaign.created_at,
      segment: campaign.segment_tag,
      recipients: campaign.recipients_count,
      sent: totals.sent,
      delivered: totals.delivered,
      opened: totals.opened,
      withClicks: totals.withClicks,
      totalClicks: totals.totalClicks,
      failed: totals.failed,
      bounced: totals.bounced,
      openRate: totals.openRate,
      clickRate: totals.clickRate,
      ctor: totals.ctor,
    });
  }

  return out.sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""));
}

function buildAutomationRows(
  rows: DeliveryRow[],
  automations: AutomationRecord[],
): AutomationStatRow[] {
  const byAutomation = new Map<string, Acc>();
  for (const row of rows) {
    if (row.kind !== "automation") continue;
    const acc = byAutomation.get(row.sourceId) ?? newAcc();
    bump(acc, row);
    byAutomation.set(row.sourceId, acc);
  }

  const out: AutomationStatRow[] = [];

  for (const automation of automations) {
    if (automation.channel === "sms") continue;
    const acc = byAutomation.get(automation.id);
    if (!acc) continue;
    const totals = toTotals(acc);
    out.push({
      id: automation.id,
      name: automation.name,
      trigger: automation.trigger_event,
      enabled: automation.enabled,
      sent: totals.sent,
      scheduled: totals.scheduled,
      failed: totals.failed,
      opened: totals.opened,
      withClicks: totals.withClicks,
      totalClicks: totals.totalClicks,
      openRate: totals.openRate,
      clickRate: totals.clickRate,
      ctor: totals.ctor,
    });
  }

  return out.sort((a, b) => b.sent - a.sent);
}

function buildPeople(
  rows: DeliveryRow[],
  subscribers: Map<string, { id: string; name: string | null }>,
): PersonStatRow[] {
  const byEmail = new Map<string, Acc>();
  for (const row of rows) {
    const acc = byEmail.get(row.email) ?? newAcc();
    bump(acc, row);
    byEmail.set(row.email, acc);
  }

  return [...byEmail.entries()].map(([email, acc]) => {
    const totals = toTotals(acc);
    const sub = subscribers.get(email);
    return {
      email,
      name: sub?.name ?? null,
      subscriberId: sub?.id ?? null,
      sent: totals.sent,
      opened: totals.opened,
      clicks: totals.totalClicks,
      openRate: totals.openRate,
      tier: engagementTier({
        emailsSent: totals.sent,
        emailsOpened: totals.opened,
        totalClicks: totals.totalClicks,
        openRate: totals.openRate,
      }),
    };
  });
}

export async function getEmailStats(
  period: StatsPeriod = 30,
): Promise<EmailStatsOverview> {
  const range = statsRange(period);
  const supabase = getAdminClient();
  // Pull the previous window too so trend arrows have a baseline.
  const fetchSince = range.previousSince ?? range.since;

  const [{ email: allRows, sms }, campaignData, automationData, clickRows, subscriberRows] =
    await Promise.all([
      loadDeliveries(fetchSince),
      supabase
        .from("email_campaigns")
        .select(
          "id, subject, status, sent_at, created_at, segment_tag, recipients_count, sent_count, opened_count, clicked_count, failed_count, bounced_count, delivered_count",
        )
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("automations").select("id, name, trigger_event, channel, enabled"),
      fetchAllRows<{
        source_type: "campaign" | "automation";
        source_id: string;
        email: string;
        link_label: string | null;
        target_url: string | null;
        clicked_at: string;
      }>((from, to) => {
        let q = supabase
          .from("email_link_clicks")
          .select("source_type, source_id, email, link_label, target_url, clicked_at")
          .order("clicked_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
        if (range.since) q = q.gte("clicked_at", range.since);
        return q;
      }),
      fetchAllRows<{
        id: string;
        email: string;
        name: string | null;
        status: string;
        created_at: string;
      }>((from, to) =>
        supabase
          .from("subscribers")
          .select("id, email, name, status, created_at")
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);

  const campaigns = (campaignData.data as CampaignRecord[] | null) ?? [];
  const automations = (automationData.data as AutomationRecord[] | null) ?? [];

  const currentRows = allRows.filter((r) => inRange(r.sentAt, range.since, range.until));
  const previousRows = range.previousSince
    ? allRows.filter((r) => inRange(r.sentAt, range.previousSince, range.previousUntil))
    : [];

  const totals = totalsFrom(currentRows);
  const previous = totalsFrom(previousRows);

  const subscriberMap = new Map(
    subscriberRows.map((s) => [
      s.email.toLowerCase(),
      { id: s.id, name: s.name },
    ]),
  );

  const people = buildPeople(currentRows, subscriberMap);

  const tiers: Record<EngagementTier, number> = { hot: 0, warm: 0, cold: 0, none: 0 };
  for (const person of people) tiers[person.tier] += 1;

  // Link aggregation.
  const linkMap = new Map<
    string,
    { linkLabel: string; targetUrl: string; clicks: number; emails: Set<string> }
  >();
  for (const click of clickRows) {
    const targetUrl = click.target_url?.trim() || "—";
    const linkLabel = click.link_label?.trim() || targetUrl;
    const key = `${linkLabel}::${targetUrl}`;
    const entry = linkMap.get(key) ?? {
      linkLabel,
      targetUrl,
      clicks: 0,
      emails: new Set<string>(),
    };
    entry.clicks += 1;
    entry.emails.add(click.email.toLowerCase());
    linkMap.set(key, entry);
  }
  const topLinks: LinkStatRow[] = [...linkMap.values()]
    .map((e) => ({
      linkLabel: e.linkLabel,
      targetUrl: e.targetUrl,
      clicks: e.clicks,
      uniqueEmails: e.emails.size,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.uniqueEmails - a.uniqueEmails)
    .slice(0, 20);

  // Domain deliverability.
  const domainMap = new Map<string, { sent: number; opened: number; emails: Set<string> }>();
  for (const row of currentRows) {
    if (row.status !== "sent") continue;
    const domain = emailDomain(row.email);
    const entry = domainMap.get(domain) ?? { sent: 0, opened: 0, emails: new Set<string>() };
    entry.sent += 1;
    entry.emails.add(row.email);
    if (isOpened(row)) entry.opened += 1;
    domainMap.set(domain, entry);
  }
  const domains: DomainStatRow[] = [...domainMap.entries()]
    .map(([domain, e]) => ({
      domain,
      recipients: e.emails.size,
      sent: e.sent,
      opened: e.opened,
      openRate: rate(e.opened, e.sent),
    }))
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 12);

  // When people actually open.
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({ hour, opens: 0 }));
  const weekdayBuckets = Array.from({ length: 7 }, (_, weekday) => ({ weekday, opens: 0 }));
  for (const row of currentRows) {
    if (!row.openedAt) continue;
    if (!inRange(row.openedAt, range.since, range.until)) continue;
    hourBuckets[hourOfDay(row.openedAt)].opens += 1;
    weekdayBuckets[weekdayIndex(row.openedAt)].opens += 1;
  }

  const campaignTitles = new Map(campaigns.map((c) => [c.id, c.subject]));
  const automationTitles = new Map(automations.map((a) => [a.id, a.name]));

  const recentClicks: RecentClickRow[] = clickRows.slice(0, 30).map((click) => ({
    email: click.email,
    sourceType: click.source_type,
    sourceTitle:
      (click.source_type === "campaign"
        ? campaignTitles.get(click.source_id)
        : automationTitles.get(click.source_id)) ?? "—",
    linkLabel: click.link_label,
    targetUrl: click.target_url,
    clickedAt: click.clicked_at,
  }));

  const inactivePeople = people
    .filter((p) => p.sent >= 3 && p.opened === 0)
    .sort((a, b) => b.sent - a.sent);

  const audience: AudienceStats = {
    total: subscriberRows.length,
    subscribed: subscriberRows.filter((s) => s.status === "subscribed").length,
    unsubscribed: subscriberRows.filter((s) => s.status === "unsubscribed").length,
    newInPeriod: subscriberRows.filter((s) =>
      inRange(s.created_at, range.since, range.until),
    ).length,
    inactive: inactivePeople.length,
  };

  const smsInPeriod = sms.filter((s) => inRange(s.sentAt, range.since, range.until));

  return {
    period,
    range,
    totals,
    previous,
    trends: {
      sent: range.previousSince ? trend(totals.sent, previous.sent) : null,
      opened: range.previousSince ? trend(totals.opened, previous.opened) : null,
      clicks: range.previousSince ? trend(totals.totalClicks, previous.totalClicks) : null,
      openRate: range.previousSince ? trend(totals.openRate, previous.openRate) : null,
    },
    timeline: buildTimeline(range, currentRows, clickRows),
    campaigns: buildCampaignRows(currentRows, campaigns, range),
    automations: buildAutomationRows(currentRows, automations),
    topLinks,
    domains,
    opensByHour: hourBuckets,
    opensByWeekday: weekdayBuckets,
    tiers,
    topByOpens: [...people]
      .sort((a, b) => b.opened - a.opened || b.openRate - a.openRate)
      .slice(0, 15),
    topByClicks: [...people]
      .sort((a, b) => b.clicks - a.clicks || b.opened - a.opened)
      .slice(0, 15),
    inactive: inactivePeople.slice(0, 20),
    recentClicks,
    audience,
    sms: {
      sent: smsInPeriod.filter((s) => s.status === "sent").length,
      failed: smsInPeriod.filter((s) => s.status === "failed").length,
      scheduled: smsInPeriod.filter((s) => s.status === "scheduled").length,
    },
  };
}
