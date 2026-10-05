import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  Automation,
  AutomationDelivery,
  AutomationTrigger,
  Locale,
  Segment,
  SegmentGroup,
} from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience, automationMatchesPurchaseProducts, automationMatchesSignupSource, automationMatchesSubscriberOrigin } from "@/lib/automation/audience";
import { formAnswersMatchConditions } from "@/lib/automation/form-conditions";
import {
  automationTriggerMatchesEvents,
  resolveAutomationTriggerEvents,
} from "@/lib/automation/triggers";
import { expandAudienceKeys } from "@/lib/segments/hierarchy";
import { ALL_HEALTH_TAG_KEYS } from "@/lib/site/health-tags";
import { isEmailUnsubscribed } from "@/lib/email/unsubscribe";
import { renderEmailTemplate } from "@/lib/automation/template";
import { automationEmailContent, automationSmsBody } from "@/lib/automation/content";
import {
  scheduledAtAfterDays,
  scheduledAtAfterMinutes,
  scheduledAtOnDate,
} from "@/lib/datetime";
import { computeAutomationSendAt } from "@/lib/automation/send-at";
import {
  automationJobIdempotencyKey,
  deliveryStatusFromWorkerResult,
} from "@/lib/automation/idempotency";
import {
  buildAutomationEmailMessage,
  prepareEmailAutomationJob,
  type PreparedEmailJob,
} from "@/lib/automation/prepare-email";
import {
  getNotificationWorkerConfig,
  isNotificationWorkerConfigured,
} from "@/lib/worker/config";
import {
  sendEmail,
  scheduleEmail,
  submitEmailJobsBatch,
  type WorkerBatchResultItem,
} from "@/lib/worker/email";
import { sendSms, scheduleSms } from "@/lib/worker/sms";
import { cancelWorkerJob } from "@/lib/automation/cancel";

export type AutomationRunContext = {
  email: string;
  name?: string | null;
  phone?: string | null;
  locale?: Locale;
  subscriberId?: string | null;
  tags?: string[];
  /** Tags before this event (e.g. before purchase) — used for segment-entry checks. */
  priorTags?: string[];
  isNew: boolean;
  source?: string;
  purchasedProductIds?: string[];
  /** When source is a form submit — the form template id. */
  formId?: string | null;
  /** Answers from that submission (choice fields only are filtered). */
  formAnswers?: Record<string, string | string[] | boolean>;
};

export type AutomationRunReport = {
  workerConfigured: boolean;
  unsubscribed: boolean;
  triggerEvents: string[];
  rulesLoaded: number;
  matchedEmail: number;
  prepared: number;
  submitted: number;
  skipped: Array<{ name: string; reason: string }>;
  errors: string[];
};

/** Purchase automations run for every buyer, including existing subscribers. */
function passesSubscriberOriginGate(
  automation: Automation,
  ctx: AutomationRunContext,
): boolean {
  if (ctx.source === "purchase" && automation.trigger_event === "purchase") {
    return true;
  }
  if (
    automation.trigger_event === "form_submit" ||
    automation.trigger_event === "segment_entry"
  ) {
    return true;
  }
  return automationMatchesSubscriberOrigin(automation, ctx);
}

function hasIncludeAudience(automation: Automation): boolean {
  return (
    (automation.segment_keys?.filter(Boolean).length ?? 0) > 0 ||
    (automation.group_ids?.filter(Boolean).length ?? 0) > 0
  );
}

/**
 * Dedicated "entered this segment" trigger: they match now, and did not match
 * on priorTags. Missing priorTags only fires for brand-new subscribers.
 */
function passesSegmentEntryGate(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  if (automation.trigger_event !== "segment_entry") return true;
  if (!hasIncludeAudience(automation)) return false;

  const nowTags = ctx.tags ?? [];
  if (!subscriberMatchesAutomationAudience(automation, nowTags, segments, groups)) {
    return false;
  }

  const prior = ctx.priorTags;
  if (prior === undefined) return ctx.isNew;

  return !subscriberMatchesAutomationAudience(
    automation,
    prior,
    segments,
    groups,
  );
}

function passesFormSubmitGate(
  automation: Automation,
  ctx: AutomationRunContext,
): { ok: true } | { ok: false; reason: string } {
  if (automation.trigger_event !== "form_submit") return { ok: true };
  const formId = automation.trigger_form_id || null;
  if (!formId) return { ok: false, reason: "form_filter" };
  if (!ctx.formId || ctx.formId !== formId) {
    return { ok: false, reason: "form_filter" };
  }
  if (
    !formAnswersMatchConditions(
      automation.form_answer_conditions,
      ctx.formAnswers ?? {},
    )
  ) {
    return { ok: false, reason: "form_answers" };
  }
  return { ok: true };
}

/**
 * On purchase, also start automations when new tags put the subscriber into the
 * target segment/group (even if they were already subscribed before paying).
 */
function passesPurchaseSegmentEntryGate(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  if (automation.trigger_event !== "purchase" || ctx.source !== "purchase") {
    return true;
  }

  const nowTags = ctx.tags ?? [];
  if (!subscriberMatchesAutomationAudience(automation, nowTags, segments, groups)) {
    return false;
  }

  const hasInclude =
    (automation.segment_keys?.filter(Boolean).length ?? 0) > 0 ||
    (automation.group_ids?.filter(Boolean).length ?? 0) > 0;

  if (!hasInclude) return true;

  const hasProductFilter =
    (automation.purchase_product_ids?.filter(Boolean).length ?? 0) > 0;
  if (hasProductFilter) return true;

  const priorTags = ctx.priorTags ?? [];
  if (priorTags.length === 0) return true;

  const wasIn = subscriberMatchesAutomationAudience(
    automation,
    priorTags,
    segments,
    groups,
  );
  return !wasIn;
}

function segmentMatches(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  if (!subscriberMatchesAutomationAudience(automation, tags, segments, groups)) {
    return false;
  }

  // Interest exclusivity for free-menu style tags (diabetes / IR / weight-loss).
  const subHealth = tags.filter((t) =>
    (ALL_HEALTH_TAG_KEYS as string[]).includes(t),
  );
  if (subHealth.length === 0) return true;

  const segmentKeys = automation.segment_keys?.filter(Boolean) ?? [];
  const groupIds = automation.group_ids?.filter(Boolean) ?? [];
  if (segmentKeys.length === 0 && groupIds.length === 0) {
    // Empty audience = general welcome for everyone.
    return true;
  }

  const expanded = expandAudienceKeys(segmentKeys, groupIds, groups, segments);
  const audienceHealth = expanded.filter((t) =>
    (ALL_HEALTH_TAG_KEYS as string[]).includes(t),
  );
  if (audienceHealth.length === 0) return true;

  const directHealth = segmentKeys.filter((k) =>
    (ALL_HEALTH_TAG_KEYS as string[]).includes(k),
  );

  // Targeting a GROUP (e.g. "Primary" = IR + diabetes) means everyone in it —
  // subscriberMatchesAutomationAudience already confirmed membership above.
  // Only a DIRECT health segment_key narrows to that specific interest.
  const required = directHealth.length > 0 ? directHealth : audienceHealth;
  return required.some((t) => subHealth.includes(t));
}


const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Why a step did not go out for someone, written on their delivery row so it
 * shows in the automation's report. A step that stops quietly is what made
 * sequences end after the second email with nothing to show for it.
 */
export const AUTOMATION_SKIP_REASONS = {
  unsubscribed: "Отписан имейл — не се изпраща.",
  noPhone: "Няма телефонен номер за SMS.",
  noEmailContent: "Няма текст на имейла (нито на BG, нито на EN).",
  noSmsContent: "Няма текст на SMS (нито на BG, нито на EN).",
  stepDisabled: "Стъпката е изключена — веригата спира тук.",
  fixedDatePassed: "Датата на стъпката вече е минала — пропусната при ръчното изпращане, за да не пристигне извън контекст.",
} as const;

function audienceSkipReason(tags: string[]): string {
  return `Не е в аудиторията на стъпката (тагове: ${tags.join(", ") || "няма"}).`;
}

function overdueSkipReason(maxOverdueMs: number): string {
  const days = Math.round(maxOverdueMs / DAY_MS);
  return `Закъсняла с над ${days} дни — пропусната, за да не пристигне извън контекст.`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function sendAtAfterDays(
  days: number,
  sendTime: string,
  from?: Date,
): string {
  return scheduledAtAfterDays(days, sendTime || "09:00", from);
}

function computeChainedSendAt(
  automation: Automation,
  parentAt: Date,
): string {
  if (automation.send_date) {
    return computeAutomationSendAt(automation, parentAt);
  }

  const delayDays = automation.delay_days ?? 0;
  if (delayDays > 0) {
    return sendAtAfterDays(
      delayDays,
      automation.send_time ?? "09:00",
      parentAt,
    );
  }

  const delayMinutes = automation.delay_minutes ?? 0;
  if (delayMinutes > 0) {
    return scheduledAtAfterMinutes(delayMinutes, parentAt);
  }

  // Same moment as parent would collide — schedule right after parent time.
  const at = parentAt.getTime() > Date.now() ? parentAt : new Date();
  return at.toISOString();
}

type DeliveryRow = Pick<AutomationDelivery, "status" | "error" | "worker_job_id" | "sent_at">;

export type StepOutcome = "sent" | "scheduled" | "skipped" | "failed";

/** Per-person state for one run: lookups loaded once, steps already handled. */
export type ChainRunState = {
  segments: Segment[];
  groups: SegmentGroup[];
  /** Steps handled for this person in this run — also stops a chain that loops back on itself. */
  visited: Set<string>;
  /**
   * Manual (late) sends only: a step on a fixed date that has already passed
   * would otherwise go out at once, right on top of the step before it.
   */
  skipPastFixedDates?: boolean;
};

async function loadDelivery(
  automationId: string,
  email: string,
): Promise<DeliveryRow | null> {
  const { data, error } = await getAdminClient()
    .from("automation_deliveries")
    .select("status, error, worker_job_id, sent_at")
    .eq("automation_id", automationId)
    .eq("email", email)
    .maybeSingle();
  // Reading "no row" on an error would either send the step twice or treat it
  // as never queued — fail loudly instead and let the caller record it.
  if (error) throw new Error(`Проверка на доставка: ${error.message}`);
  return (data as DeliveryRow | null) ?? null;
}

function isLiveDelivery(row: DeliveryRow | null | undefined): boolean {
  return row?.status === "sent" || row?.status === "scheduled";
}

async function alreadyQueuedOrSent(
  automationId: string,
  email: string,
): Promise<boolean> {
  return isLiveDelivery(await loadDelivery(automationId, email));
}

type DeliveryInput = {
  automationId: string;
  subscriberId?: string | null;
  email: string;
  phone?: string | null;
  channel: Automation["channel"];
  status: "scheduled" | "sent" | "failed" | "skipped";
  workerJobId?: string | null;
  error?: string | null;
  scheduledFor?: string | null;
};

/** Error message, or null when the row was written. */
async function writeDelivery(input: DeliveryInput): Promise<string | null> {
  const supabase = getAdminClient();
  const row = {
    automation_id: input.automationId,
    subscriber_id: input.subscriberId ?? null,
    email: input.email,
    phone: input.phone ?? null,
    channel: input.channel,
    status: input.status,
    worker_job_id: input.workerJobId ?? null,
    error: input.error ?? null,
    scheduled_for: input.scheduledFor ?? null,
    sent_at: new Date().toISOString(),
  };

  if (input.status === "sent" || input.status === "scheduled") {
    const { error } = await supabase
      .from("automation_deliveries")
      .upsert(row, { onConflict: "automation_id,email" });
    return error?.message ?? null;
  }

  // A skip or a failure must never overwrite a step that already went out or
  // is queued — the row is what stops it going out twice.
  const { data, error } = await supabase
    .from("automation_deliveries")
    .update(row)
    .eq("automation_id", input.automationId)
    .eq("email", input.email)
    .not("status", "in", "(sent,scheduled)")
    .select("id");
  if (error) return error.message;
  if (((data as unknown[] | null) ?? []).length > 0) return null;

  const { error: insertError } = await supabase
    .from("automation_deliveries")
    .upsert(row, { onConflict: "automation_id,email", ignoreDuplicates: true });
  return insertError?.message ?? null;
}

async function recordDelivery(input: DeliveryInput): Promise<void> {
  // A lost row means the "already sent" check misses it next time, and the
  // report shows nothing for this person — worth one more try.
  let message = await writeDelivery(input).catch((err) => errorMessage(err, "write failed"));
  if (message) {
    message = await writeDelivery(input).catch((err) => errorMessage(err, "write failed"));
  }
  if (message) {
    console.error(
      `[automation] record delivery ${input.automationId} ${input.email} (${input.status}):`,
      message,
    );
  }
}

async function recordSkip(
  automation: Automation,
  ctx: AutomationRunContext,
  reason: string,
  existing?: DeliveryRow | null,
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();
  console.info(`[automation] skip ${automation.name} ${email}: ${reason}`);
  // Re-checked every day by the catch-up — nothing new to write.
  if (existing?.status === "skipped" && existing.error === reason) return;
  await recordDelivery({
    automationId: automation.id,
    subscriberId: ctx.subscriberId,
    email,
    phone: ctx.phone,
    channel: automation.channel,
    status: "skipped",
    error: reason,
  });
}

async function recordFailure(
  automation: Pick<Automation, "id" | "name" | "channel">,
  ctx: AutomationRunContext,
  message: string,
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();
  console.error(`[automation] failed ${automation.name} ${email}: ${message}`);
  await recordDelivery({
    automationId: automation.id,
    subscriberId: ctx.subscriberId,
    email,
    phone: ctx.phone,
    channel: automation.channel,
    status: "failed",
    error: message,
  });
}

type WorkerAnswer = {
  jobId: string;
  status: string;
  sent?: number;
  failed?: number;
  dispatch?: string;
  error?: string;
};

/**
 * The worker answers a known idempotency key with the job it already has. A
 * `canceled` answer can only be such an old job (a new one is never born
 * cancelled): the step was switched off, or the person unsubscribed and came
 * back. Same for `failed` when this person already had a row for the step.
 * Reusing the key would record that dead job forever; one retry under a fresh
 * key sends the email for real.
 */
async function callWorkerWithFreshKeyFallback(
  call: (idempotencyKey: string) => Promise<WorkerAnswer>,
  key: string,
  hadPrevious: boolean,
): Promise<WorkerAnswer> {
  const res = await call(key);
  const dead = res.status === "canceled" || (hadPrevious && res.status === "failed");
  if (!dead) return res;
  return call(`${key}-r${Date.now().toString(36)}`);
}

async function recordWorkerAnswer(
  automation: Pick<Automation, "id" | "channel">,
  ctx: AutomationRunContext,
  res: WorkerAnswer,
  opts: { sendAt: string; sendNow: boolean; phone?: string | null },
): Promise<"sent" | "scheduled" | "failed"> {
  const status = deliveryStatusFromWorkerResult({
    jobId: res.jobId,
    status: res.status,
    sendAt: opts.sendAt,
    dispatch: opts.sendNow ? "immediate" : res.dispatch,
    sent: res.sent,
    failed: res.failed,
    error: res.error,
  });
  await recordDelivery({
    automationId: automation.id,
    subscriberId: ctx.subscriberId,
    email: ctx.email.trim().toLowerCase(),
    phone: opts.phone ?? ctx.phone,
    channel: automation.channel,
    status,
    workerJobId: res.jobId || null,
    error:
      status === "failed"
        ? res.error || `Изпращачът върна статус „${res.status || "неизвестен"}“.`
        : null,
    scheduledFor: status === "scheduled" ? opts.sendAt : null,
  });
  return status;
}

/** Hand one step to the worker and record what it answered. Throws on transport errors. */
async function submitStep(
  automation: Automation,
  ctx: AutomationRunContext,
  sendAt: string,
  sendNow: boolean,
  existing: DeliveryRow | null,
  /** A manual send is a new job every time — the trigger key would return the old one. */
  idempotencyKey?: string,
): Promise<StepOutcome> {
  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) {
    await recordSkip(automation, ctx, AUTOMATION_SKIP_REASONS.unsubscribed, existing);
    return "skipped";
  }

  const locale: Locale = ctx.locale === "en" ? "en" : "bg";
  const key =
    idempotencyKey ??
    automationJobIdempotencyKey(automation.id, {
      email,
      subscriberId: ctx.subscriberId,
    });
  const hadPrevious = Boolean(existing);

  if (automation.channel === "sms") {
    const phone = ctx.phone?.trim();
    if (!phone) {
      await recordSkip(automation, ctx, AUTOMATION_SKIP_REASONS.noPhone, existing);
      return "skipped";
    }
    const body = renderEmailTemplate(automationSmsBody(automation, locale), {
      name: ctx.name,
      email,
    });
    if (!body.trim()) {
      await recordSkip(automation, ctx, AUTOMATION_SKIP_REASONS.noSmsContent, existing);
      return "skipped";
    }
    const res = await callWorkerWithFreshKeyFallback(
      (idempotencyKey) =>
        sendNow
          ? sendSms({ body, recipients: [phone], idempotencyKey })
          : scheduleSms({ body, recipients: [phone], sendAt, idempotencyKey }),
      key,
      hadPrevious,
    );
    return recordWorkerAnswer(automation, ctx, res, { sendAt, sendNow, phone });
  }

  const message = await buildAutomationEmailMessage(automation, ctx);
  if (!message) {
    await recordSkip(automation, ctx, AUTOMATION_SKIP_REASONS.noEmailContent, existing);
    return "skipped";
  }
  const res = await callWorkerWithFreshKeyFallback(
    (idempotencyKey) =>
      sendNow
        ? sendEmail({ ...message, recipients: [email], idempotencyKey })
        : scheduleEmail({ ...message, recipients: [email], sendAt, idempotencyKey }),
    key,
    hadPrevious,
  );
  return recordWorkerAnswer(automation, ctx, res, { sendAt, sendNow });
}

/**
 * Send or queue one step for one person, then lay out the steps after it.
 * Every way this can end leaves a delivery row: sent, scheduled, skipped with
 * the reason, or failed with the error (the daily catch-up retries failures).
 */
async function deliverStep(
  automation: Automation,
  ctx: AutomationRunContext,
  sendAt: string,
  run: ChainRunState,
  existing: DeliveryRow | null,
): Promise<StepOutcome> {
  run.visited.add(automation.id);
  const sendNow = new Date(sendAt).getTime() <= Date.now() + 1000;

  let outcome: StepOutcome;
  try {
    outcome = await submitStep(automation, ctx, sendAt, sendNow, existing);
  } catch (err) {
    await recordFailure(automation, ctx, errorMessage(err, "Неуспешно изпращане"));
    return "failed";
  }

  if (outcome === "sent" || outcome === "scheduled") {
    await scheduleChainedFromParent(
      automation.id,
      sendNow ? new Date().toISOString() : sendAt,
      ctx,
      run,
    );
  }
  return outcome;
}

/**
 * One chain step for someone whose previous step just went out (or is queued).
 *
 * The parent already passed the trigger checks (form, product, signup source,
 * origin, segment entry). Re-running those on every step stopped sequences
 * after step 2 as soon as a step's trigger settings drifted from its parent's,
 * so a step only checks who it is for (its own include/exclude audience).
 */
async function runChainStep(
  step: Automation,
  ctx: AutomationRunContext,
  parentAt: Date,
  run: ChainRunState,
  opts?: { maxOverdueMs?: number },
): Promise<StepOutcome | "already"> {
  const email = ctx.email.trim().toLowerCase();
  run.visited.add(step.id);

  let existing: DeliveryRow | null;
  let sendAt: string;
  try {
    existing = await loadDelivery(step.id, email);
    if (isLiveDelivery(existing)) return "already";

    if (!step.enabled) {
      await recordSkip(step, ctx, AUTOMATION_SKIP_REASONS.stepDisabled, existing);
      return "skipped";
    }

    const tags = ctx.tags ?? [];
    if (!segmentMatches(step, tags, run.segments, run.groups)) {
      await recordSkip(step, ctx, audienceSkipReason(tags), existing);
      return "skipped";
    }

    if (
      run.skipPastFixedDates &&
      step.send_date &&
      new Date(scheduledAtOnDate(step.send_date, step.send_time ?? "09:00")).getTime() <=
        parentAt.getTime()
    ) {
      await recordSkip(step, ctx, AUTOMATION_SKIP_REASONS.fixedDatePassed, existing);
      return "skipped";
    }

    sendAt = computeChainedSendAt(step, parentAt);
  } catch (err) {
    await recordFailure(step, ctx, errorMessage(err, "Грешка при подготовка на стъпката"));
    return "failed";
  }

  if (opts?.maxOverdueMs !== undefined) {
    // A no-delay step was due when its parent went out (computeChainedSendAt
    // clamps that to "now"). Long overdue: a "day 2" email weeks later reads
    // out of context, so skip it.
    const hasDelay =
      Boolean(step.send_date) ||
      (step.delay_days ?? 0) > 0 ||
      (step.delay_minutes ?? 0) > 0;
    const dueMs = hasDelay ? new Date(sendAt).getTime() : parentAt.getTime();
    if (dueMs < Date.now() - opts.maxOverdueMs) {
      await recordSkip(step, ctx, overdueSkipReason(opts.maxOverdueMs), existing);
      return "skipped";
    }
  }

  return deliverStep(step, ctx, sendAt, run, existing);
}

/**
 * Queue every step that follows `parentAutomationId` for this person, timed
 * from the parent. Disabled steps get a "skipped" row too, so the report says
 * where the sequence stopped instead of just ending.
 */
async function scheduleChainedFromParent(
  parentAutomationId: string,
  parentSendAt: string,
  ctx: AutomationRunContext,
  run: ChainRunState,
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();

  const { data, error } = await getAdminClient()
    .from("automations")
    .select("*")
    .eq("after_automation_id", parentAutomationId)
    .order("sort_order", { ascending: true });
  if (error) {
    // No per-step row can be written without the steps; the daily catch-up
    // queues them from the parent's delivery row.
    console.error(
      `[automation] chain: could not load steps after ${parentAutomationId} for ${email} — the daily catch-up will queue them:`,
      error.message,
    );
    return;
  }

  // A missing/garbled sendAt from the worker would make every downstream date
  // Invalid, and `toISOString()` then throws.
  const parsedParentAt = new Date(parentSendAt);
  const parentAt = Number.isNaN(parsedParentAt.getTime())
    ? new Date()
    : parsedParentAt;

  for (const step of (data as Automation[]) ?? []) {
    if (run.visited.has(step.id)) continue;
    try {
      const outcome = await runChainStep(step, ctx, parentAt, run);
      if (outcome === "failed") {
        console.warn(`[automation] chain step ${step.name} failed for ${email} — catch-up will retry`);
      }
    } catch (err) {
      // runChainStep records its own outcome; this only guards the loop.
      console.error(`[automation] chain ${step.id} ${email}:`, err);
    }
  }
}

/**
 * Queue one chain step for someone whose parent step already went out (or is
 * queued), timed from that parent. Used by the catch-up job: the chain is
 * otherwise only laid out at signup, so a step switched on later — new steps
 * start disabled — never reached anyone who had already signed up.
 */
export async function continueChainStep(
  automation: Automation,
  ctx: AutomationRunContext,
  parentAt: Date,
  opts: { segments: Segment[]; groups: SegmentGroup[]; maxOverdueMs: number },
): Promise<StepOutcome | "already"> {
  return runChainStep(
    automation,
    ctx,
    parentAt,
    { segments: opts.segments, groups: opts.groups, visited: new Set() },
    { maxOverdueMs: opts.maxOverdueMs },
  );
}

/**
 * Second attempt for a first step (no parent) that failed when its trigger
 * fired — the worker was down, a timeout, a rejected request. Chain steps are
 * retried by continueChainStep; without this a failed first email ended the
 * whole sequence for that person.
 */
export async function retryFailedAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
  failedAt: Date,
  opts: { segments: Segment[]; groups: SegmentGroup[] },
): Promise<StepOutcome | "already"> {
  const email = ctx.email.trim().toLowerCase();
  const run: ChainRunState = {
    segments: opts.segments,
    groups: opts.groups,
    visited: new Set([automation.id]),
  };

  let existing: DeliveryRow | null;
  let sendAt: string;
  try {
    existing = await loadDelivery(automation.id, email);
    if (existing?.status !== "failed") return "already";
    const tags = ctx.tags ?? [];
    if (!segmentMatches(automation, tags, run.segments, run.groups)) {
      await recordSkip(automation, ctx, audienceSkipReason(tags), existing);
      return "skipped";
    }
    sendAt = computeAutomationSendAt(automation, failedAt);
  } catch (err) {
    await recordFailure(automation, ctx, errorMessage(err, "Грешка при повторен опит"));
    return "failed";
  }
  return deliverStep(automation, ctx, sendAt, run, existing);
}

export type ManualSendOutcome = StepOutcome | "already";

/**
 * Open/click tracking belongs to the job that was sent. A resend over a row
 * that already went out would otherwise show the new email as opened.
 */
async function clearDeliveryTracking(automationId: string, email: string): Promise<void> {
  const { error } = await getAdminClient()
    .from("automation_deliveries")
    .update({
      recipient_status: null,
      opened_at: null,
      delivered_at: null,
      click_count: 0,
      first_clicked_at: null,
      last_synced_at: null,
    })
    .eq("automation_id", automationId)
    .eq("email", email);
  if (error) console.error(`[automation] clear tracking ${automationId} ${email}:`, error.message);
}

/**
 * Send one step right now to one person, by hand from the admin — no trigger,
 * no trigger checks, no audience checks: whoever was picked gets it. Writes the
 * same delivery row as an automatic send, so it shows up in the step's report.
 *
 * Without `resend`, someone who already has this step (sent or queued) is left
 * alone — that is what makes a big send safe to run again for the rest. With
 * it, a queued copy is cancelled first so the person does not get it twice.
 * `continueChain` lays out the following steps from now, the same way a real
 * trigger would; steps the person already has are skipped.
 */
export async function sendAutomationStepNow(
  automation: Automation,
  ctx: AutomationRunContext,
  opts: {
    segments: Segment[];
    groups: SegmentGroup[];
    resend: boolean;
    continueChain: boolean;
    /** Later than now = queued for then (spreading a big send out). */
    sendAt?: string;
  },
): Promise<ManualSendOutcome> {
  const email = ctx.email.trim().toLowerCase();
  const run: ChainRunState = {
    segments: opts.segments,
    groups: opts.groups,
    visited: new Set([automation.id]),
    skipPastFixedDates: true,
  };
  const requested = opts.sendAt ? new Date(opts.sendAt) : null;
  const sendAt =
    requested && !Number.isNaN(requested.getTime()) && requested.getTime() > Date.now()
      ? requested.toISOString()
      : new Date().toISOString();
  const sendNow = new Date(sendAt).getTime() <= Date.now() + 1000;

  let existing: DeliveryRow | null;
  try {
    existing = await loadDelivery(automation.id, email);
  } catch (err) {
    await recordFailure(automation, ctx, errorMessage(err, "Грешка при ръчно изпращане"));
    return "failed";
  }
  if (isLiveDelivery(existing)) {
    if (!opts.resend) return "already";
    if (existing?.status === "scheduled" && existing.worker_job_id) {
      const canceled = await cancelWorkerJob(existing.worker_job_id, automation.channel).catch(
        () => false,
      );
      // Sending anyway would mail them twice once the queued job fires.
      if (!canceled) return "already";
    }
  }

  const baseKey = automationJobIdempotencyKey(automation.id, {
    email,
    subscriberId: ctx.subscriberId,
  });
  let outcome: StepOutcome;
  try {
    outcome = await submitStep(
      automation,
      ctx,
      sendAt,
      sendNow,
      existing,
      `${baseKey}-m${Date.now().toString(36)}`,
    );
  } catch (err) {
    await recordFailure(automation, ctx, errorMessage(err, "Неуспешно изпращане"));
    return "failed";
  }

  if (outcome === "sent" || outcome === "scheduled") {
    if (isLiveDelivery(existing)) await clearDeliveryTracking(automation.id, email);
    if (opts.continueChain) {
      await scheduleChainedFromParent(
        automation.id,
        sendNow ? new Date().toISOString() : sendAt,
        ctx,
        run,
      );
    }
  }
  return outcome;
}

type GateResult =
  | { ok: true; existing: DeliveryRow | null }
  | { ok: false; reason: string };

async function passesAutomationGates(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
): Promise<GateResult> {
  const email = ctx.email.trim().toLowerCase();
  const tags = ctx.tags ?? [];

  if (!passesSubscriberOriginGate(automation, ctx)) {
    return { ok: false, reason: "subscriber_origin" };
  }
  if (!passesPurchaseSegmentEntryGate(automation, ctx, segments, groups)) {
    return { ok: false, reason: "purchase_segment_gate" };
  }
  if (!segmentMatches(automation, tags, segments, groups)) {
    return {
      ok: false,
      reason: `audience (tags=${tags.join(",") || "∅"})`,
    };
  }
  if (
    automation.trigger_event === "purchase" &&
    !automationMatchesPurchaseProducts(automation, ctx.purchasedProductIds ?? [])
  ) {
    return { ok: false, reason: "product_filter" };
  }
  if (
    automation.trigger_event === "new_subscriber" &&
    !automationMatchesSignupSource(automation, ctx.source)
  ) {
    return { ok: false, reason: `signup_source (${ctx.source ?? "∅"})` };
  }
  const formGate = passesFormSubmitGate(automation, ctx);
  if (!formGate.ok) return formGate;
  if (!passesSegmentEntryGate(automation, ctx, segments, groups)) {
    return { ok: false, reason: "segment_entry_gate" };
  }

  const existing = await loadDelivery(automation.id, email);
  if (isLiveDelivery(existing)) {
    return { ok: false, reason: "already_queued_or_sent" };
  }

  if (automation.after_automation_id) {
    // Chain steps are queued from their parent (scheduleChainedFromParent).
    // Here only when the parent went out on an earlier visit: a no-delay step
    // can go now; a delayed one is left to the catch-up, which times it from
    // the parent instead of from today.
    const gotPrior = await alreadyQueuedOrSent(
      automation.after_automation_id,
      email,
    );
    if (!gotPrior) {
      return { ok: false, reason: "waiting_for_parent_automation" };
    }
    const hasRelativeDelay =
      (automation.delay_days ?? 0) > 0 || (automation.delay_minutes ?? 0) > 0;
    if (hasRelativeDelay) {
      return { ok: false, reason: "chained_delay_not_from_parent" };
    }
  }

  return { ok: true, existing };
}

/** Send one already-rendered job on its own (batch fallback), record it, chain on. */
async function submitPreparedJob(
  job: PreparedEmailJob,
  rule: Automation,
  ctx: AutomationRunContext,
  run: ChainRunState,
  existing: DeliveryRow | null,
): Promise<StepOutcome> {
  const sendNow = new Date(job.sendAt).getTime() <= Date.now() + 1000;
  let status: "sent" | "scheduled" | "failed";
  try {
    const message = {
      subject: job.subject,
      html: job.html,
      recipients: job.recipients,
      attachments: job.attachments,
    };
    const res = await callWorkerWithFreshKeyFallback(
      (idempotencyKey) =>
        sendNow
          ? sendEmail({ ...message, idempotencyKey })
          : scheduleEmail({ ...message, sendAt: job.sendAt, idempotencyKey }),
      // The batch may have reached the worker before it failed — the key keeps
      // this fallback from mailing the person twice.
      job.idempotencyKey,
      Boolean(existing),
    );
    status = await recordWorkerAnswer(rule, ctx, res, { sendAt: job.sendAt, sendNow });
  } catch (err) {
    await recordFailure(rule, ctx, errorMessage(err, "Неуспешно изпращане"));
    return "failed";
  }
  if (status === "sent" || status === "scheduled") {
    await scheduleChainedFromParent(
      rule.id,
      sendNow ? new Date().toISOString() : job.sendAt,
      ctx,
      run,
    );
  }
  return status;
}

/** Run all matching enabled automations for this subscriber event. */
export async function runAutomations(
  ctx: AutomationRunContext,
): Promise<AutomationRunReport> {
  const report: AutomationRunReport = {
    workerConfigured: isNotificationWorkerConfigured(),
    unsubscribed: false,
    triggerEvents: [],
    rulesLoaded: 0,
    matchedEmail: 0,
    prepared: 0,
    submitted: 0,
    skipped: [],
    errors: [],
  };

  if (!report.workerConfigured) {
    console.error(
      "[automation] skipped: NOTIFICATION_WORKER_URL / API_KEY not configured",
    );
    report.errors.push("worker_not_configured");
    return report;
  }

  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) {
    report.unsubscribed = true;
    report.errors.push("unsubscribed");
    return report;
  }

  const source = ctx.source ?? "popup";
  const events = resolveAutomationTriggerEvents(source, ctx.isNew);
  report.triggerEvents = events;
  if (events.length === 0) {
    console.info(
      `[automation] no trigger for source=${source} isNew=${ctx.isNew} email=${email}`,
    );
    report.errors.push("no_trigger_for_source");
    return report;
  }

  const supabase = getAdminClient();
  const [
    { data, error },
    { data: segmentRows, error: segmentError },
    { data: groupRows, error: groupError },
  ] = await Promise.all([
    supabase
      .from("automations")
      .select("*")
      .eq("enabled", true)
      .in("trigger_event", events as unknown as AutomationTrigger[])
      .order("sort_order", { ascending: true }),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);

  const loadError = error ?? segmentError ?? groupError;
  if (loadError) {
    // Without segments/groups every audience check would come out wrong.
    console.error("[automation] load rules:", loadError.message);
    report.errors.push(`load_rules: ${loadError.message}`);
    return report;
  }

  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];
  const rules = (data as Automation[]) ?? [];
  report.rulesLoaded = rules.length;
  if (rules.length === 0) {
    console.info(
      `[automation] no enabled rules for triggers=${events.join(",")} email=${email}`,
    );
    report.errors.push("no_enabled_rules");
    return report;
  }

  const run: ChainRunState = { segments, groups, visited: new Set() };
  const smsRules: { rule: Automation; existing: DeliveryRow | null }[] = [];
  const emailRules: { rule: Automation; existing: DeliveryRow | null }[] = [];

  for (const rule of rules) {
    let gate: GateResult;
    try {
      gate = await passesAutomationGates(rule, ctx, segments, groups);
    } catch (err) {
      const message = errorMessage(err, "gate_check_failed");
      report.errors.push(`${rule.name}: ${message}`);
      await recordFailure(rule, ctx, message);
      continue;
    }
    if (!gate.ok) {
      report.skipped.push({ name: rule.name, reason: gate.reason });
      console.info(`[automation] skip ${rule.name}: ${gate.reason}`);
      continue;
    }
    if (rule.channel === "sms") smsRules.push({ rule, existing: gate.existing });
    else emailRules.push({ rule, existing: gate.existing });
  }

  report.matchedEmail = emailRules.length;

  if (emailRules.length === 0 && smsRules.length === 0) {
    console.warn(
      `[automation] ${rules.length} enabled rule(s) for ${events.join(",")} but none matched ${email} (tags=${(ctx.tags ?? []).join(",") || "∅"})`,
    );
  }

  if (emailRules.length > 0) {
    const settled = await Promise.allSettled(
      emailRules.map(({ rule }) => prepareEmailAutomationJob(rule, ctx)),
    );
    const prepared: { job: PreparedEmailJob; rule: Automation; existing: DeliveryRow | null }[] = [];

    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i];
      const { rule, existing } = emailRules[i];
      if (result.status === "fulfilled" && result.value) {
        prepared.push({ job: result.value, rule, existing });
        continue;
      }
      if (result.status === "fulfilled") {
        report.skipped.push({ name: rule.name, reason: AUTOMATION_SKIP_REASONS.noEmailContent });
        await recordSkip(rule, ctx, AUTOMATION_SKIP_REASONS.noEmailContent, existing);
        continue;
      }
      const message = errorMessage(result.reason, "prepare_failed");
      report.skipped.push({ name: rule.name, reason: message });
      report.errors.push(`${rule.name}: ${message}`);
      await recordFailure(rule, ctx, message);
    }

    report.prepared = prepared.length;

    if (prepared.length > 0) {
      let answers: WorkerBatchResultItem[] | null = null;
      try {
        const batch = await submitEmailJobsBatch(prepared.map(({ job }) => job));
        answers = batch.results ?? [];
        console.info(
          `[automation] batch ${prepared.length} email(s) for ${email} → worker`,
        );
      } catch (err) {
        // Rejected or unreachable — every job goes through the single-job path.
        const message = errorMessage(err, "Batch send failed");
        console.error("[automation] email batch:", message);
        report.errors.push(message);
      }

      const byKey = new Map(
        (answers ?? [])
          .filter((item) => item.idempotencyKey)
          .map((item) => [item.idempotencyKey as string, item]),
      );
      const sameOrder = answers?.length === prepared.length;

      for (let i = 0; i < prepared.length; i += 1) {
        const entry = prepared[i];
        run.visited.add(entry.rule.id);
        const item =
          byKey.get(entry.job.idempotencyKey) ??
          (sameOrder && answers ? answers[i] : undefined);

        // No answer for this job, or the key matched an old dead job (see
        // callWorkerWithFreshKeyFallback) — send it on its own.
        if (
          !item ||
          item.status === "canceled" ||
          (entry.existing && item.status === "failed")
        ) {
          const outcome = await submitPreparedJob(entry.job, entry.rule, ctx, run, entry.existing);
          if (outcome === "failed") {
            report.errors.push(`${entry.job.automationName}: send failed`);
          } else {
            report.submitted += 1;
          }
          continue;
        }

        report.submitted += 1;
        try {
          const status = await recordWorkerAnswer(entry.rule, ctx, item, {
            sendAt: item.sendAt || entry.job.sendAt,
            sendNow: item.dispatch === "immediate",
          });
          if (status === "failed") {
            report.errors.push(`${entry.job.automationName}: ${item.error || item.status}`);
            continue;
          }
          await scheduleChainedFromParent(
            entry.rule.id,
            item.sendAt || entry.job.sendAt,
            ctx,
            run,
          );
        } catch (err) {
          const message = errorMessage(err, "record failed");
          report.errors.push(`${entry.job.automationName}: ${message}`);
          console.error(`[automation] after batch ${entry.rule.name} ${email}:`, message);
        }
      }
    }
  }

  for (const { rule, existing } of smsRules) {
    let sendAt: string;
    try {
      sendAt = computeAutomationSendAt(rule);
    } catch (err) {
      const message = errorMessage(err, "Невалидна дата на изпращане");
      report.errors.push(`${rule.name}: ${message}`);
      await recordFailure(rule, ctx, message);
      continue;
    }
    const outcome = await deliverStep(rule, ctx, sendAt, run, existing);
    if (outcome === "failed") report.errors.push(`${rule.name}: SMS send failed`);
  }

  return report;
}

export async function runAutomationsForSubscriber(
  ctx: AutomationRunContext,
): Promise<AutomationRunReport> {
  return runAutomations(ctx);
}

export type AutomationDiagnosisRule = {
  name: string;
  enabled: boolean;
  channel: string;
  triggerEvent: string;
  wouldSend: boolean;
  reason: string;
  emptyContent: boolean;
};

export type AutomationDiagnosis = {
  workerConfigured: boolean;
  workerUrl: string;
  workerFrom: string;
  unsubscribed: boolean;
  isNew: boolean;
  source: string;
  tags: string[];
  triggerEvents: string[];
  /** @deprecated use totalRules */
  enabledRulesForTrigger: number;
  totalRules: number;
  matchingTriggerCount: number;
  wouldSendCount: number;
  rules: AutomationDiagnosisRule[];
  notes: string[];
};

/** Parent → child order, so a step is evaluated after the step before it. */
function chainDepth(step: Automation, byId: Map<string, Automation>): number {
  let depth = 0;
  let cur: Automation | undefined = step;
  const seen = new Set<string>();
  while (cur?.after_automation_id && !seen.has(cur.id)) {
    seen.add(cur.id);
    depth += 1;
    cur = byId.get(cur.after_automation_id);
  }
  return depth;
}

/**
 * Dry-run: evaluate every automation for this context WITHOUT sending.
 * Explains, per rule, whether it would fire and why not — chain steps included,
 * the way the real run reaches them (after their parent). Used by admin diagnostics.
 */
export async function diagnoseAutomations(
  ctx: AutomationRunContext,
): Promise<AutomationDiagnosis> {
  const cfg = getNotificationWorkerConfig();
  const email = ctx.email.trim().toLowerCase();
  const source = ctx.source ?? "popup";
  const events = resolveAutomationTriggerEvents(source, ctx.isNew);
  const notes: string[] = [];

  const diagnosis: AutomationDiagnosis = {
    workerConfigured: isNotificationWorkerConfigured(),
    workerUrl: cfg.url || "(не е зададен)",
    workerFrom: cfg.from,
    unsubscribed: false,
    isNew: ctx.isNew,
    source,
    tags: ctx.tags ?? [],
    triggerEvents: events,
    enabledRulesForTrigger: 0,
    totalRules: 0,
    matchingTriggerCount: 0,
    wouldSendCount: 0,
    rules: [],
    notes,
  };

  if (!diagnosis.workerConfigured) {
    notes.push(
      "NOTIFICATION_WORKER_URL / API_KEY липсват — нищо няма да се изпрати.",
    );
  }

  if (await isEmailUnsubscribed(email)) {
    diagnosis.unsubscribed = true;
    notes.push("Този имейл е отписан (unsubscribed) — автоматизации не се пращат.");
  }

  if (events.length === 0) {
    notes.push(
      `При source="${source}" и isNew=${ctx.isNew} няма активен тригер — автоматизациите за запис/покупка няма да стартират, освен ако не симулираш друго събитие.`,
    );
  } else {
    notes.push(
      `Активни тригери за тази симулация: ${events.join(", ")}.`,
    );
  }

  const supabase = getAdminClient();
  const [{ data, error }, { data: segmentRows }, { data: groupRows }, { data: deliveryRows }] =
    await Promise.all([
      supabase
        .from("automations")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase.from("segments").select("*"),
      supabase.from("segment_groups").select("*"),
      supabase
        .from("automation_deliveries")
        .select("automation_id, status, error")
        .eq("email", email),
    ]);

  if (error) {
    notes.push(`Грешка при зареждане на автоматизациите: ${error.message}`);
    return diagnosis;
  }

  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];
  const allRules = (data as Automation[]) ?? [];
  const deliveries = new Map(
    ((deliveryRows as { automation_id: string; status: string; error: string | null }[] | null) ?? []).map(
      (row) => [row.automation_id, row],
    ),
  );
  diagnosis.totalRules = allRules.length;
  diagnosis.enabledRulesForTrigger = allRules.filter((r) => r.enabled).length;

  if (allRules.length === 0) {
    notes.push("Няма създадени автоматизации.");
    return diagnosis;
  }

  if (diagnosis.unsubscribed) {
    for (const rule of allRules) {
      diagnosis.rules.push({
        name: rule.name,
        enabled: rule.enabled,
        channel: rule.channel,
        triggerEvent: rule.trigger_event,
        wouldSend: false,
        reason: "отписан имейл",
        emptyContent: false,
      });
    }
    return diagnosis;
  }

  const locale: Locale = ctx.locale === "en" ? "en" : "bg";
  const byId = new Map(allRules.map((r) => [r.id, r]));
  /** Per step: goes out in this run, already went out earlier, or stops here. */
  const state = new Map<string, "will" | "done" | "no">();
  const rowsById = new Map<string, AutomationDiagnosisRule>();
  const isLive = (id: string) => {
    const status = deliveries.get(id)?.status;
    return status === "sent" || status === "scheduled";
  };
  const contentMissing = (rule: Automation) =>
    rule.channel === "email"
      ? !automationEmailContent(rule, locale)
      : !automationSmsBody(rule, locale);

  const ordered = [...allRules].sort(
    (a, b) => chainDepth(a, byId) - chainDepth(b, byId),
  );

  for (const rule of ordered) {
    const emptyContent = contentMissing(rule);
    const push = (wouldSend: boolean, reason: string, next: "will" | "done" | "no") => {
      state.set(rule.id, next);
      if (wouldSend) diagnosis.wouldSendCount += 1;
      rowsById.set(rule.id, {
        name: rule.name,
        enabled: rule.enabled,
        channel: rule.channel,
        triggerEvent: rule.trigger_event,
        wouldSend,
        reason,
        emptyContent,
      });
    };

    const parent = rule.after_automation_id ? byId.get(rule.after_automation_id) : undefined;

    if (isLive(rule.id)) {
      push(false, "вече е изпратена или насрочена за този имейл", "done");
      continue;
    }
    if (!rule.enabled) {
      push(false, parent ? "изключена — веригата спира тук" : "изключена", "no");
      continue;
    }

    if (parent) {
      // Chain step: reached through its parent, whatever its own trigger says.
      const parentState = state.get(parent.id) ?? (isLive(parent.id) ? "done" : "no");
      if (parentState === "no") {
        push(false, `чака „${parent.name}“, която няма да се изпрати при тази симулация`, "no");
        continue;
      }
      const tags = ctx.tags ?? [];
      if (!segmentMatches(rule, tags, segments, groups)) {
        push(false, `стъпка след „${parent.name}“: ${audienceSkipReason(tags)}`, "no");
        continue;
      }
      if (emptyContent) {
        push(false, rule.channel === "email" ? AUTOMATION_SKIP_REASONS.noEmailContent : AUTOMATION_SKIP_REASONS.noSmsContent, "no");
        continue;
      }
      if (rule.channel === "sms" && !ctx.phone?.trim()) {
        push(false, AUTOMATION_SKIP_REASONS.noPhone, "no");
        continue;
      }
      push(
        true,
        parentState === "will"
          ? `ще се насрочи след „${parent.name}“`
          : `„${parent.name}“ вече е изпратена — тази стъпка ще я навакса ежедневната проверка`,
        "will",
      );
      continue;
    }

    if (!automationTriggerMatchesEvents(rule.trigger_event, events)) {
      push(
        false,
        `trigger: при source="${source}" isNew=${ctx.isNew} се задейства [${events.join(", ") || "нищо"}], а тази е „${rule.trigger_event}"`,
        "no",
      );
      continue;
    }

    diagnosis.matchingTriggerCount += 1;

    let gate: GateResult;
    try {
      gate = await passesAutomationGates(rule, ctx, segments, groups);
    } catch (err) {
      push(false, `грешка при проверката: ${errorMessage(err, "неизвестна")}`, "no");
      continue;
    }
    if (!gate.ok) {
      push(false, gate.reason, "no");
      continue;
    }
    if (emptyContent) {
      push(false, rule.channel === "email" ? AUTOMATION_SKIP_REASONS.noEmailContent : AUTOMATION_SKIP_REASONS.noSmsContent, "no");
      continue;
    }
    if (rule.channel === "sms" && !ctx.phone?.trim()) {
      push(false, AUTOMATION_SKIP_REASONS.noPhone, "no");
      continue;
    }
    push(true, "ще изпрати", "will");
  }

  // Report in the admin's own order, not chain-depth order.
  for (const rule of allRules) {
    const row = rowsById.get(rule.id);
    if (row) diagnosis.rules.push(row);
  }

  if (diagnosis.wouldSendCount === 0) {
    notes.push(
      "Нито една автоматизация не би се изпратила при тази симулация — виж причините по-долу.",
    );
  }

  return diagnosis;
}
