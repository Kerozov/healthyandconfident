import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";
import {
  buildPurchaseIndex,
  purchaseAfterEmail,
} from "@/lib/admin/email-attribution";

export type CampaignRecipientState =
  | "clicked"
  | "opened"
  | "not_opened"
  | "bounced"
  | "failed"
  | "waiting";

export type CampaignRecipientRow = {
  email: string;
  name: string | null;
  state: CampaignRecipientState;
  sentAt: string;
  openedAt: string | null;
  clicks: number;
  /** First paid order within 7 days after the email. */
  boughtAt: string | null;
};

export type CampaignLinkRow = {
  label: string;
  url: string;
  clicks: number;
  people: number;
};

export type CampaignStatsDetail = {
  recipients: CampaignRecipientRow[];
  links: CampaignLinkRow[];
};

type DeliveryRow = {
  email: string;
  status: string;
  recipient_status: string | null;
  opened_at: string | null;
  click_count: number | null;
  sent_at: string;
};

function stateOf(row: DeliveryRow): CampaignRecipientState {
  if (row.status === "failed") return "failed";
  if (row.status === "scheduled") return "waiting";
  const recipient = row.recipient_status ?? "";
  if (recipient.includes("bounce")) return "bounced";
  if ((row.click_count ?? 0) > 0 || recipient === "clicked") return "clicked";
  if (row.opened_at || recipient === "opened") return "opened";
  return "not_opened";
}

/** Person-by-person result of one campaign, with its links. */
export async function getCampaignStatsDetail(
  campaignId: string,
): Promise<CampaignStatsDetail> {
  const supabase = getAdminClient();

  const [deliveries, clicks] = await Promise.all([
    fetchAllRows<DeliveryRow>((from, to) =>
      supabase
        .from("campaign_deliveries")
        .select("email, status, recipient_status, opened_at, click_count, sent_at")
        .eq("campaign_id", campaignId)
        .neq("status", "canceled")
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<{
      email: string;
      link_label: string | null;
      target_url: string | null;
    }>((from, to) =>
      supabase
        .from("email_link_clicks")
        .select("email, link_label, target_url")
        .eq("source_type", "campaign")
        .eq("source_id", campaignId)
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const emails = [...new Set(deliveries.map((d) => d.email.toLowerCase()))];
  const firstSent = deliveries.reduce<string | null>(
    (min, d) => (!min || d.sent_at < min ? d.sent_at : min),
    null,
  );

  const names = new Map<string, string | null>();
  const purchaseRows: { email: string; purchased_at: string }[] = [];
  for (const batch of chunkArray(emails, 150)) {
    const [subs, paid] = await Promise.all([
      supabase.from("subscribers").select("email, name").in("email", batch),
      firstSent
        ? supabase
            .from("subscriber_purchases")
            .select("email, purchased_at")
            .eq("payment_status", "paid")
            .gte("purchased_at", firstSent)
            .in("email", batch)
        : Promise.resolve({ data: [] }),
    ]);
    for (const s of (subs.data as { email: string; name: string | null }[] | null) ?? []) {
      names.set(s.email.toLowerCase(), s.name);
    }
    purchaseRows.push(
      ...((paid.data as { email: string; purchased_at: string }[] | null) ?? []),
    );
  }
  const purchases = buildPurchaseIndex(
    purchaseRows.map((p) => ({ email: p.email, purchasedAt: p.purchased_at })),
  );

  // Clicks counted from the click log too, so a sync lag in click_count still
  // shows the person as clicked.
  const clicksByEmail = new Map<string, number>();
  const linkMap = new Map<string, { label: string; url: string; clicks: number; people: Set<string> }>();
  for (const click of clicks) {
    const email = click.email.toLowerCase();
    clicksByEmail.set(email, (clicksByEmail.get(email) ?? 0) + 1);
    const url = click.target_url?.trim() || "-";
    const label = click.link_label?.trim() || url;
    const key = `${label}::${url}`;
    const entry = linkMap.get(key) ?? { label, url, clicks: 0, people: new Set<string>() };
    entry.clicks += 1;
    entry.people.add(email);
    linkMap.set(key, entry);
  }

  const byEmail = new Map<string, CampaignRecipientRow>();
  for (const row of deliveries) {
    const email = row.email.toLowerCase();
    const loggedClicks = clicksByEmail.get(email) ?? 0;
    const clickTotal = Math.max(row.click_count ?? 0, loggedClicks);
    let state = stateOf({ ...row, click_count: clickTotal });
    const sent = row.status === "sent";
    const next: CampaignRecipientRow = {
      email,
      name: names.get(email) ?? null,
      state,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      clicks: clickTotal,
      boughtAt: sent ? purchaseAfterEmail(purchases, email, row.sent_at) : null,
    };
    // A resend to the same address: keep the better outcome.
    const prev = byEmail.get(email);
    if (prev) {
      const rank = (s: CampaignRecipientState) =>
        ["waiting", "failed", "bounced", "not_opened", "opened", "clicked"].indexOf(s);
      if (rank(prev.state) > rank(state)) state = prev.state;
      next.state = state;
      next.clicks = Math.max(prev.clicks, next.clicks);
      next.openedAt = prev.openedAt ?? next.openedAt;
      next.boughtAt = prev.boughtAt ?? next.boughtAt;
    }
    byEmail.set(email, next);
  }

  const order: Record<CampaignRecipientState, number> = {
    clicked: 0,
    opened: 1,
    not_opened: 2,
    bounced: 3,
    failed: 4,
    waiting: 5,
  };

  return {
    recipients: [...byEmail.values()].sort(
      (a, b) =>
        Number(Boolean(b.boughtAt)) - Number(Boolean(a.boughtAt)) ||
        order[a.state] - order[b.state] ||
        b.clicks - a.clicks ||
        a.email.localeCompare(b.email),
    ),
    links: [...linkMap.values()]
      .map((l) => ({ label: l.label, url: l.url, clicks: l.clicks, people: l.people.size }))
      .sort((a, b) => b.clicks - a.clicks),
  };
}
