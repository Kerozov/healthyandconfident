import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/admin/stats-shared";
import { labelSignupSource } from "@/lib/automation/signup-sources";
import { ALL_HEALTH_TAG_KEYS } from "@/lib/site/health-tags";
import { FREE_MENU_TAG } from "@/lib/site/free-menu";
import type { Subscriber } from "@/lib/supabase/types";

export type FreeMenuInterest = (typeof ALL_HEALTH_TAG_KEYS)[number];

/** Where the menu email stands for one person, most telling state first. */
export type FreeMenuEmailState =
  | "clicked"
  | "opened"
  | "sent"
  | "scheduled"
  | "bounced"
  | "failed"
  | "skipped"
  | "none";

export type FreeMenuSignup = {
  id: string;
  email: string;
  name: string | null;
  facebook: string | null;
  phone: string | null;
  locale: Subscriber["locale"];
  source: string;
  sourceLabel: string;
  /** The answer to "С какво можем да ти помогнем?" - kept on the subscriber as tags. */
  interests: FreeMenuInterest[];
  unsubscribed: boolean;
  createdAt: string;
  menuEmail: { state: FreeMenuEmailState; at: string | null };
};

export type FreeMenuReport = {
  signups: FreeMenuSignup[];
  /** The automations whose email delivers the menu, for the screen's explanation. */
  menuEmailNames: string[];
};

type SignupRow = Pick<
  Subscriber,
  | "id"
  | "email"
  | "name"
  | "first_name"
  | "last_name"
  | "facebook_url"
  | "phone"
  | "locale"
  | "source"
  | "status"
  | "tags"
  | "created_at"
>;

type DeliveryRow = {
  subscriber_id: string | null;
  email: string | null;
  status: string | null;
  recipient_status: string | null;
  sent_at: string | null;
  scheduled_for: string | null;
  opened_at: string | null;
  click_count: number | null;
};

/** Sources the server sets itself - not on the signup-source picker, so named here. */
const SERVER_SOURCE_LABELS: Record<string, string> = {
  purchase: "Покупка",
  manual: "Добавен ръчно",
  import: "Импорт",
  launchifybg: "Launchify",
  "funnel-brand": "Launchify",
  "final-cta": "Финална секция",
};

function sourceLabel(source: string): string {
  return SERVER_SOURCE_LABELS[source] ?? labelSignupSource(source);
}

function emailState(d: DeliveryRow): FreeMenuEmailState {
  if (d.recipient_status === "clicked" || (d.click_count ?? 0) > 0) return "clicked";
  if (d.recipient_status === "opened" || d.opened_at) return "opened";
  if (d.recipient_status === "bounced") return "bounced";
  if (d.status === "failed" || d.recipient_status === "failed") return "failed";
  if (d.status === "scheduled") return "scheduled";
  if (d.status === "sent") return "sent";
  return "skipped";
}

const STATE_RANK: Record<FreeMenuEmailState, number> = {
  clicked: 7,
  opened: 6,
  sent: 5,
  scheduled: 4,
  bounced: 3,
  failed: 2,
  skipped: 1,
  none: 0,
};

/**
 * Everyone in the free-menu segment with what they answered in the form and
 * whether the menu email reached them. The form writes straight onto the
 * subscriber (name, Facebook, health answer as a tag), so that row is the
 * record of the answers; the date is when the person joined the list.
 */
export async function getFreeMenuReport(): Promise<FreeMenuReport> {
  const supabase = getAdminClient();

  const [rows, menuRules] = await Promise.all([
    fetchAllRows<SignupRow>(
      (from, to) =>
        supabase
          .from("subscribers")
          .select(
            "id, email, name, first_name, last_name, facebook_url, phone, locale, source, status, tags, created_at",
          )
          .contains("tags", [FREE_MENU_TAG])
          // Tied timestamps (a bulk import) would repeat or drop rows across pages.
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      { pageSize: 1000, maxPages: 100 },
    ),
    // The first email of the free-menu chain is the one that carries the menu.
    supabase
      .from("automations")
      .select("id, name")
      .eq("trigger_event", "segment_entry")
      .eq("channel", "email")
      .contains("segment_keys", [FREE_MENU_TAG])
      .is("after_automation_id", null),
  ]);

  if (menuRules.error) {
    console.error("[free-menu] menu automations:", menuRules.error.message);
  }
  const rules = (menuRules.data as { id: string; name: string }[] | null) ?? [];
  const ruleIds = rules.map((r) => r.id);

  const deliveries =
    ruleIds.length === 0
      ? []
      : await fetchAllRows<DeliveryRow>(
          (from, to) =>
            supabase
              .from("automation_deliveries")
              .select(
                "subscriber_id, email, status, recipient_status, sent_at, scheduled_for, opened_at, click_count",
              )
              .in("automation_id", ruleIds)
              .order("id", { ascending: true })
              .range(from, to),
          { pageSize: 1000, maxPages: 100 },
        );

  // Someone mailed twice (re-entered the segment) is judged by the furthest the menu got.
  const bestBySubscriber = new Map<string, FreeMenuSignup["menuEmail"]>();
  for (const d of deliveries) {
    const key = d.subscriber_id ?? d.email?.toLowerCase();
    if (!key) continue;
    const state = emailState(d);
    const at = state === "scheduled" ? d.scheduled_for ?? d.sent_at : d.sent_at;
    const current = bestBySubscriber.get(key);
    if (!current || STATE_RANK[state] > STATE_RANK[current.state]) {
      bestBySubscriber.set(key, { state, at });
    }
  }

  const signups = rows.map((row): FreeMenuSignup => {
    const tags = row.tags ?? [];
    const name =
      [row.first_name, row.last_name].filter((p) => p?.trim()).join(" ").trim() ||
      row.name?.trim() ||
      null;
    return {
      id: row.id,
      email: row.email,
      name,
      facebook: row.facebook_url?.trim() || null,
      phone: row.phone?.trim() || null,
      locale: row.locale,
      source: row.source,
      sourceLabel: sourceLabel(row.source),
      interests: ALL_HEALTH_TAG_KEYS.filter((key) => tags.includes(key)),
      unsubscribed: row.status === "unsubscribed",
      createdAt: row.created_at,
      menuEmail: bestBySubscriber.get(row.id) ??
        bestBySubscriber.get(row.email.toLowerCase()) ?? { state: "none", at: null },
    };
  });

  return { signups, menuEmailNames: rules.map((r) => r.name) };
}
