import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Automation,
  AutomationChannel,
  Segment,
  SegmentGroup,
} from "@/lib/supabase/types";
import {
  automationMatchesSignupSource,
  automationMatchesSubscriberOrigin,
  subscriberMatchesAutomationAudience,
} from "@/lib/automation/audience";
import { formAnswersMatchConditions } from "@/lib/automation/form-conditions";
import {
  normalizeAutomationTrigger,
  resolveAutomationTriggerEvents,
} from "@/lib/automation/triggers";
import { fetchAllRows, statsRange, type StatsPeriod } from "@/lib/admin/stats-shared";
import { chunkArray } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A chain step this far past due with no row is reported as missing. */
const CHAIN_GRACE_MS = 2 * 60 * 60 * 1000;
const MAX_ISSUES = 3000;

export type DeliveryIssueKind = "missing" | "failed" | "skipped" | "bounced";

export type DeliveryIssue = {
  automationId: string;
  automationName: string;
  channel: AutomationChannel;
  email: string;
  name: string | null;
  kind: DeliveryIssueKind;
  /** Plain-language reason, as shown to the admin. */
  reason: string;
  /** When it should have gone / was attempted. */
  at: string | null;
  /** False when sending again cannot help (unsubscribed, not on the list). */
  canSend: boolean;
};

export type DeliveryIssuesReport = {
  issues: DeliveryIssue[];
  ignored: number;
  truncated: boolean;
};

type DeliveryRow = {
  automation_id: string;
  email: string;
  status: string;
  error: string | null;
  recipient_status: string | null;
  sent_at: string;
  scheduled_for: string | null;
};

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  source: string | null;
  tags: string[] | null;
  created_at: string;
};

function bounceReason(status: string | null): string {
  if (status === "complained") return "Маркиран като спам от получателя.";
  if (status === "bounced") return "Върнат — адресът не приема поща (bounce).";
  return "Изпращачът отчете неуспешна доставка.";
}

function maxIso(a: string | null, b: string): string {
  if (!a) return b;
  return a > b ? a : b;
}

/**
 * Everyone an automation step did not reach in the period, with why:
 *
 * - **missing** — should have got it and there is no delivery row at all. The
 *   automation never ran for them: a bug or outage at signup time, or a chain
 *   step that was never queued. This is the case the automation's own report
 *   cannot show, because it only lists rows.
 * - **failed / skipped** — a row with the error or skip reason.
 * - **bounced** — went out but the worker saw a bounce or complaint.
 *
 * "Missing" for first steps is worked out the same way the trigger decides:
 * new subscribers (signup source, origin, audience) and form submissions
 * (form + answer conditions). Purchase and segment-entry triggers depend on the
 * moment of the event and are not reconstructed.
 */
export async function getDeliveryIssues(period: StatsPeriod): Promise<DeliveryIssuesReport> {
  const supabase = getAdminClient();
  const { since } = statsRange(period);

  const [autoRes, segRes, groupRes, ignoreRes] = await Promise.all([
    supabase.from("automations").select("*"),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
    fetchAllRows<{ automation_id: string; email: string }>((from, to) =>
      supabase
        .from("delivery_issue_ignores")
        .select("automation_id, email")
        .order("automation_id")
        .order("email")
        .range(from, to),
    ),
  ]);
  const loadError = autoRes.error ?? segRes.error ?? groupRes.error;
  if (loadError) throw new Error(loadError.message);

  const automations = (autoRes.data as Automation[]) ?? [];
  const byId = new Map(automations.map((a) => [a.id, a]));
  const segments = (segRes.data as Segment[]) ?? [];
  const groups = (groupRes.data as SegmentGroup[]) ?? [];
  const ignored = new Set(ignoreRes.map((r) => `${r.automation_id}|${r.email}`));

  const issues: DeliveryIssue[] = [];
  let ignoredCount = 0;
  /** automation|email pairs that already have any row — never "missing". */
  const hasRow = new Set<string>();
  const subscriberEmails = new Set<string>();

  function push(issue: Omit<DeliveryIssue, "name" | "canSend">) {
    if (ignored.has(`${issue.automationId}|${issue.email}`)) {
      ignoredCount += 1;
      return;
    }
    issues.push({ ...issue, name: null, canSend: true });
    subscriberEmails.add(issue.email);
  }

  // ── Rows that say it did not arrive ──────────────────────
  const problemRows = await fetchAllRows<DeliveryRow>((from, to) => {
    let q = supabase
      .from("automation_deliveries")
      .select("automation_id, email, status, error, recipient_status, sent_at, scheduled_for")
      .or("status.in.(failed,skipped),recipient_status.in.(bounced,failed,complained)")
      .order("id")
      .range(from, to);
    if (since) q = q.gte("sent_at", since);
    return q;
  });
  for (const row of problemRows) {
    const automation = byId.get(row.automation_id);
    if (!automation) continue;
    const email = row.email.trim().toLowerCase();
    hasRow.add(`${automation.id}|${email}`);
    const bounced = row.status === "sent" || row.status === "scheduled";
    push({
      automationId: automation.id,
      automationName: automation.name,
      channel: automation.channel,
      email,
      kind: bounced ? "bounced" : row.status === "failed" ? "failed" : "skipped",
      reason: bounced
        ? bounceReason(row.recipient_status)
        : row.error?.trim() || (row.status === "failed" ? "Неуспешно изпращане." : "Пропусната."),
      at: row.sent_at,
    });
  }

  // ── First steps that never ran: new subscribers ──────────
  const firstSteps = automations.filter((a) => a.enabled && !a.after_automation_id);
  const signupSteps = firstSteps.filter(
    (a) => normalizeAutomationTrigger(a.trigger_event) === "new_subscriber",
  );
  if (signupSteps.length > 0) {
    const earliest = signupSteps.reduce(
      (min, a) => (a.created_at < min ? a.created_at : min),
      signupSteps[0].created_at,
    );
    const subs = await fetchAllRows<SubscriberRow>((from, to) =>
      supabase
        .from("subscribers")
        .select("id, email, name, status, source, tags, created_at")
        .eq("status", "subscribed")
        .gte("created_at", maxIso(since, earliest))
        .order("id")
        .range(from, to),
    );
    for (const step of signupSteps) {
      const from = maxIso(since, step.created_at);
      const candidates = subs.filter(
        (s) =>
          s.created_at >= from &&
          // Same source → trigger mapping as signup: a buyer never fires "new subscriber".
          resolveAutomationTriggerEvents(s.source ?? "popup", true).includes("new_subscriber") &&
          automationMatchesSubscriberOrigin(step, { isNew: true, source: s.source }) &&
          automationMatchesSignupSource(step, s.source) &&
          subscriberMatchesAutomationAudience(step, s.tags ?? [], segments, groups),
      );
      await pushMissing(
        step,
        candidates.map((s) => ({ email: s.email, at: s.created_at })),
        "Записа се, но автоматизацията не е тръгнала — няма никакъв запис (грешка или прекъсване при записването).",
      );
    }
  }

  // ── First steps that never ran: form submissions ─────────
  for (const step of firstSteps.filter((a) => a.trigger_event === "form_submit" && a.trigger_form_id)) {
    const from = maxIso(since, step.created_at);
    const submissions = await fetchAllRows<{ email: string | null; answers: Record<string, unknown>; submitted_at: string }>(
      (f, t) =>
        supabase
          .from("form_submissions")
          .select("email, answers, submitted_at")
          .eq("form_id", step.trigger_form_id!)
          .gte("submitted_at", from)
          .order("id")
          .range(f, t),
    );
    const matching = submissions.filter(
      (s) => s.email && formAnswersMatchConditions(step.form_answer_conditions, s.answers),
    );
    await pushMissing(
      step,
      matching.map((s) => ({ email: s.email!, at: s.submitted_at })),
      "Попълни формата, но автоматизацията не е тръгнала — няма никакъв запис.",
    );
  }

  // ── Chain steps whose parent went out but they never did ─
  for (const step of automations.filter((a) => a.enabled && a.after_automation_id)) {
    const parent = byId.get(step.after_automation_id!);
    if (!parent) continue;
    const parents = await fetchAllRows<{ email: string; sent_at: string; scheduled_for: string | null }>(
      (f, t) => {
        let q = supabase
          .from("automation_deliveries")
          .select("email, sent_at, scheduled_for")
          .eq("automation_id", parent.id)
          .eq("status", "sent")
          .order("id")
          .range(f, t);
        if (since) q = q.gte("sent_at", since);
        return q;
      },
    );
    const delayMs = (step.delay_days ?? 0) * DAY_MS + (step.delay_minutes ?? 0) * 60_000;
    const now = Date.now();
    const due = parents
      .map((p) => {
        const parentAt = new Date(p.scheduled_for ?? p.sent_at).getTime();
        const dueAt = step.send_date ? new Date(step.send_date).getTime() : parentAt + delayMs;
        return { email: p.email, dueAt };
      })
      .filter((p) => !Number.isNaN(p.dueAt) && p.dueAt < now - CHAIN_GRACE_MS)
      .map((p) => ({ email: p.email, at: new Date(p.dueAt).toISOString() }));
    await pushMissing(
      step,
      due,
      `Получи „${parent.name}“, но тази стъпка не е изпратена и не е насрочена.`,
    );
  }

  async function pushMissing(
    step: Automation,
    candidates: { email: string; at: string }[],
    reason: string,
  ) {
    const unique = new Map<string, string>();
    for (const c of candidates) {
      const email = c.email.trim().toLowerCase();
      if (!unique.has(email)) unique.set(email, c.at);
    }
    const emails = [...unique.keys()].filter((e) => !hasRow.has(`${step.id}|${e}`));
    if (emails.length === 0) return;
    const withRow = new Set<string>();
    for (const batch of chunkArray(emails, 200)) {
      const { data, error } = await supabase
        .from("automation_deliveries")
        .select("email")
        .eq("automation_id", step.id)
        .in("email", batch);
      if (error) throw new Error(error.message);
      for (const row of (data as { email: string }[] | null) ?? []) {
        withRow.add(row.email.trim().toLowerCase());
      }
    }
    for (const email of emails) {
      if (withRow.has(email)) continue;
      push({
        automationId: step.id,
        automationName: step.name,
        channel: step.channel,
        email,
        kind: "missing",
        reason,
        at: unique.get(email) ?? null,
      });
    }
  }

  // Names, and whether sending again can reach them at all.
  const subscribers = new Map<string, { name: string | null; status: string }>();
  for (const batch of chunkArray([...subscriberEmails], 200)) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("email, name, status")
      .in("email", batch);
    if (error) throw new Error(error.message);
    for (const row of (data as { email: string; name: string | null; status: string }[] | null) ?? []) {
      subscribers.set(row.email.trim().toLowerCase(), { name: row.name, status: row.status });
    }
  }
  for (const issue of issues) {
    const sub = subscribers.get(issue.email);
    issue.name = sub?.name ?? null;
    issue.canSend = sub?.status === "subscribed" && issue.kind !== "bounced";
  }

  issues.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
  return {
    issues: issues.slice(0, MAX_ISSUES),
    ignored: ignoredCount,
    truncated: issues.length > MAX_ISSUES,
  };
}
