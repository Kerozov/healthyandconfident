import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation } from "@/lib/supabase/types";
import { cancelWorkerJob } from "@/lib/automation/cancel";
import { requeueStepForNewEmail, type AutomationRunContext } from "@/lib/automation/run";
import { campaignRecipientMerge } from "@/lib/campaign/merge";
import { replaceEmailJobRecipient, type ReplaceRecipientResult } from "@/lib/worker/email";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { recordSubscriberHistory } from "@/lib/admin/contact-statuses";

/** Same rule as the database function — checked here first for a clear message. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  locale: string | null;
  tags: string[] | null;
  source: string | null;
};

type QueuedStep = { automationId: string; sendAt: string };

export type ChangeEmailResult =
  | { ok: false; message: string }
  | {
      ok: true;
      changed: boolean;
      oldEmail: string;
      newEmail: string;
      /** Automation emails queued again for the new address. */
      automations: number;
      /** Scheduled campaigns now going to the new address. */
      campaigns: number;
      /** Payment reminders now going to the new address. */
      reminders: number;
      /** Old rows moved over: sent emails, clicks, purchases, form answers. */
      moved: Record<string, number>;
      /** Plain-language notes on anything that still goes to the old address. */
      warnings: string[];
    };

function contextFor(sub: SubscriberRow, email: string): AutomationRunContext {
  return {
    email,
    name: sub.name,
    firstName: sub.first_name,
    lastName: sub.last_name,
    phone: sub.phone,
    locale: sub.locale === "en" ? "en" : "bg",
    subscriberId: sub.id,
    tags: sub.tags ?? [],
    isNew: false,
    source: sub.source ?? undefined,
  };
}

function rpcMessage(message: string): string {
  if (message.includes("email_taken")) return "Този имейл вече е на друг човек.";
  if (message.includes("invalid_email")) return "Имейлът не изглежда правилен.";
  if (message.includes("subscriber_not_found")) return "Човекът не е намерен.";
  return `Имейлът не беше сменен: ${message}`;
}

/** Was this worker answer a success for the new address? */
function swapped(outcome: ReplaceRecipientResult): boolean {
  return outcome === "replaced" || outcome === "unchanged";
}

/**
 * Cancel this person's queued automation emails in the worker. Their body has
 * the old address baked in (`{{email}}`, the unsubscribe link), so they are
 * sent again for the new one instead of being re-addressed.
 */
async function cancelQueuedAutomationEmails(
  email: string,
  warnings: string[],
): Promise<QueuedStep[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("automation_deliveries")
    .select("id, automation_id, worker_job_id, scheduled_for, automations(name)")
    .eq("email", email)
    .eq("channel", "email")
    .eq("status", "scheduled")
    .order("id", { ascending: true });
  if (error) throw new Error(`Чакащите автоматизации не се прочетоха: ${error.message}`);

  const rows =
    (data as unknown as
      | {
          id: string;
          automation_id: string;
          worker_job_id: string | null;
          scheduled_for: string | null;
          automations: { name: string } | { name: string }[] | null;
        }[]
      | null) ?? [];

  const queued: QueuedStep[] = [];
  for (const row of rows) {
    const name =
      (Array.isArray(row.automations) ? row.automations[0]?.name : row.automations?.name) ??
      "автоматизация";
    if (!(await cancelWorkerJob(row.worker_job_id, "email"))) {
      warnings.push(`„${name}“ вече се изпраща и ще отиде на стария имейл.`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("automation_deliveries")
      .update({ status: "canceled" })
      .eq("id", row.id);
    if (updateError) {
      console.error("[change-email] mark canceled:", updateError.message);
    }
    queued.push({
      automationId: row.automation_id,
      sendAt: row.scheduled_for ?? new Date().toISOString(),
    });
  }
  return queued;
}

async function requeueSteps(
  steps: QueuedStep[],
  ctx: AutomationRunContext,
  warnings: string[] | null,
): Promise<number> {
  if (steps.length === 0) return 0;
  const { data, error } = await getAdminClient()
    .from("automations")
    .select("*")
    .in("id", [...new Set(steps.map((s) => s.automationId))]);
  if (error) {
    warnings?.push(`Автоматизациите не се пренасрочиха: ${error.message}`);
    return 0;
  }
  const byId = new Map(((data as Automation[] | null) ?? []).map((a) => [a.id, a]));

  let queued = 0;
  for (const step of steps) {
    const automation = byId.get(step.automationId);
    if (!automation) continue;
    const outcome = await requeueStepForNewEmail(automation, ctx, step.sendAt);
    if (outcome === "sent" || outcome === "scheduled" || outcome === "already") {
      queued += 1;
    } else if (outcome === "failed") {
      warnings?.push(`„${automation.name}“ не се пренасрочи — опитай пак от автоматизацията.`);
    } else {
      warnings?.push(`„${automation.name}“ беше пропусната за новия имейл.`);
    }
  }
  return queued;
}

/** Scheduled campaigns: one worker job for the whole audience, so only this address is swapped. */
async function moveScheduledCampaigns(
  sub: SubscriberRow,
  oldEmail: string,
  newEmail: string,
  warnings: string[],
): Promise<number> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("campaign_deliveries")
    .select("id, worker_job_id, email_campaigns(subject, locale)")
    .eq("email", newEmail)
    .eq("status", "scheduled")
    .not("worker_job_id", "is", null);
  if (error) {
    warnings.push(`Насрочените кампании не се прочетоха: ${error.message}`);
    return 0;
  }

  type Row = {
    id: string;
    worker_job_id: string;
    email_campaigns:
      | { subject: string | null; locale: string | null }
      | { subject: string | null; locale: string | null }[]
      | null;
  };
  let moved = 0;
  for (const row of (data as unknown as Row[] | null) ?? []) {
    const campaign = Array.isArray(row.email_campaigns)
      ? row.email_campaigns[0]
      : row.email_campaigns;
    const name = campaign?.subject?.trim() || "кампания";
    const locale = campaign?.locale === "en" ? "en" : "bg";
    const outcome = await replaceEmailJobRecipient(
      row.worker_job_id,
      oldEmail,
      newEmail,
      campaignRecipientMerge(sub, newEmail, locale),
    );
    if (swapped(outcome)) {
      moved += 1;
    } else if (outcome === "not_pending") {
      warnings.push(`Кампанията „${name}“ вече се изпраща и ще отиде на стария имейл.`);
    } else if (outcome !== "not_in_job") {
      warnings.push(`Кампанията „${name}“ не можа да се пренасочи към новия имейл.`);
    }
  }
  return moved;
}

/** Payment reminders: their text has no address in it, so the job is simply re-addressed. */
async function moveReminders(
  contactId: string,
  oldEmail: string,
  newEmail: string,
  warnings: string[],
): Promise<number> {
  const { data, error } = await getAdminClient()
    .from("contact_worker_jobs")
    .select("worker_job_id")
    .eq("contact_id", contactId)
    .eq("status", "pending");
  if (error) {
    warnings.push(`Напомнянията за плащане не се прочетоха: ${error.message}`);
    return 0;
  }
  let moved = 0;
  for (const row of (data as { worker_job_id: string | null }[] | null) ?? []) {
    if (!row.worker_job_id) continue;
    const outcome = await replaceEmailJobRecipient(row.worker_job_id, oldEmail, newEmail);
    if (swapped(outcome)) moved += 1;
    else if (outcome === "not_pending") {
      warnings.push("Едно напомняне за плащане вече се изпраща и ще отиде на стария имейл.");
    } else if (outcome !== "not_in_job") {
      warnings.push("Едно напомняне за плащане не можа да се пренасочи към новия имейл.");
    }
  }
  return moved;
}

/**
 * Change one person's email everywhere: their profile, their history (sent
 * emails, clicks, purchases, form answers) and everything still queued for
 * them — automations, scheduled campaigns and payment reminders.
 *
 * Order matters. Queued automation emails are cancelled first, so nothing
 * goes to the old address after the switch. The database moves everything in
 * one transaction; if that fails the cancelled emails are queued again for the
 * old address and nothing has changed. Only then do the worker jobs follow.
 */
export async function changeSubscriberEmail(input: {
  subscriberId: string;
  newEmail: string;
  actor: { id: string | null; name: string };
}): Promise<ChangeEmailResult> {
  const newEmail = input.newEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(newEmail)) {
    return { ok: false, message: "Имейлът не изглежда правилен." };
  }

  const supabase = getAdminClient();
  const { data: subData, error: subError } = await supabase
    .from("subscribers")
    .select("id, email, name, first_name, last_name, phone, locale, tags, source")
    .eq("id", input.subscriberId)
    .maybeSingle();
  if (subError) return { ok: false, message: subError.message };
  const sub = subData as SubscriberRow | null;
  if (!sub) return { ok: false, message: "Човекът не е намерен." };

  const oldEmail = sub.email.trim().toLowerCase();
  if (oldEmail === newEmail) {
    return {
      ok: true,
      changed: false,
      oldEmail,
      newEmail,
      automations: 0,
      campaigns: 0,
      reminders: 0,
      moved: {},
      warnings: [],
    };
  }

  const [takenSub, takenContact] = await Promise.all([
    supabase.from("subscribers").select("id").eq("email", newEmail).neq("id", sub.id).limit(1),
    supabase.from("contacts").select("id").eq("email", newEmail).neq("id", sub.id).limit(1),
  ]);
  if (takenSub.error || takenContact.error) {
    return {
      ok: false,
      message: (takenSub.error ?? takenContact.error)?.message ?? "Проверката не мина.",
    };
  }
  if ((takenSub.data ?? []).length > 0 || (takenContact.data ?? []).length > 0) {
    return { ok: false, message: "Този имейл вече е на друг човек." };
  }

  const warnings: string[] = [];
  const workerOn = isNotificationWorkerConfigured();

  let queued: QueuedStep[] = [];
  if (workerOn) {
    try {
      queued = await cancelQueuedAutomationEmails(oldEmail, warnings);
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("change_subscriber_email", {
    p_subscriber_id: sub.id,
    p_new_email: newEmail,
  });
  if (rpcError) {
    // Nothing moved — put the cancelled emails back for the old address.
    await requeueSteps(queued, contextFor(sub, oldEmail), null);
    return { ok: false, message: rpcMessage(rpcError.message) };
  }

  const rpc = (rpcData ?? {}) as { moved?: Record<string, number> };
  const ctx = contextFor({ ...sub, email: newEmail }, newEmail);

  let automations = 0;
  let campaigns = 0;
  let reminders = 0;
  if (workerOn) {
    automations = await requeueSteps(queued, ctx, warnings);
    campaigns = await moveScheduledCampaigns(sub, oldEmail, newEmail, warnings);
    reminders = await moveReminders(sub.id, oldEmail, newEmail, warnings);
  }

  await recordSubscriberHistory([
    {
      subscriber_id: sub.id,
      kind: "email",
      details: {
        from: oldEmail,
        to: newEmail,
        automations,
        campaigns,
        reminders,
        moved: rpc.moved ?? {},
        warnings,
      },
      actor_id: input.actor.id,
      actor_name: input.actor.name,
    },
  ]);

  return {
    ok: true,
    changed: true,
    oldEmail,
    newEmail,
    automations,
    campaigns,
    reminders,
    moved: rpc.moved ?? {},
    warnings,
  };
}
