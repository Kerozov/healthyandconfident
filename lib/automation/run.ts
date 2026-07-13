import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTrigger, Locale, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience, automationMatchesPurchaseProducts, automationMatchesSignupSource } from "@/lib/automation/audience";
import { expandAudienceKeys } from "@/lib/segments/hierarchy";
import { ALL_HEALTH_TAG_KEYS } from "@/lib/site/health-tags";
import { buildBrandedEmail } from "@/lib/email/compose";
import { buildEmailBodyForRecipient } from "@/lib/email/build-body";
import { automationCtaRedirectUrl } from "@/lib/email/cta-redirect";
import { unsubscribeLinkForEmail, isEmailUnsubscribed } from "@/lib/email/unsubscribe";
import { renderEmailTemplate } from "@/lib/automation/template";
import {
  scheduledAtAfterDays,
  scheduledAtAfterMinutes,
} from "@/lib/datetime";
import { computeAutomationSendAt } from "@/lib/automation/send-at";
import {
  automationIdFromIdempotencyKey,
  automationJobIdempotencyKey,
  deliveryStatusFromWorkerResult,
} from "@/lib/automation/idempotency";
import {
  prepareEmailAutomationJob,
} from "@/lib/automation/prepare-email";
import {
  getNotificationWorkerConfig,
  isNotificationWorkerConfigured,
} from "@/lib/worker/config";
import { sendEmail, scheduleEmail, submitEmailJobsBatch } from "@/lib/worker/email";
import { sendSms, scheduleSms } from "@/lib/worker/sms";

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
};

function isSiteSignupSource(source: string): boolean {
  const s = (source || "").toLowerCase();
  if (!s) return true;
  if (s === "purchase" || s === "manual" || s === "import" || s === "system") {
    return false;
  }
  return true;
}

function resolveTriggerEvents(
  source: string,
  isNew: boolean,
): Array<"purchase" | "new_subscriber" | "registration"> {
  // Payment always starts the purchase flow only — not welcome drips.
  if (source === "purchase") return ["purchase"];
  // Public site signup (menu, popup, hero, nav…) — even if email already exists.
  if (isSiteSignupSource(source)) {
    return ["new_subscriber", "registration"];
  }
  if (isNew) return ["new_subscriber", "registration"];
  return [];
}

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
function passesNewSubscriberGate(
  automation: Automation,
  ctx: AutomationRunContext,
): boolean {
  if (!automation.new_subscribers_only) return true;
  if (ctx.source === "purchase" && automation.trigger_event === "purchase") {
    return true;
  }
  if (ctx.isNew) return true;
  // Free menu / popup for an existing email still runs (unless already sent).
  if (isSiteSignupSource(ctx.source ?? "")) return true;
  return false;
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

function idempotencyKey(
  automationId: string,
  ctx: { email: string; subscriberId?: string | null },
): string {
  return automationJobIdempotencyKey(automationId, ctx);
}

async function alreadyQueuedOrSent(
  automationId: string,
  email: string,
): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id")
    .eq("automation_id", automationId)
    .eq("email", email)
    .in("status", ["sent", "scheduled"])
    .maybeSingle();
  return Boolean(data);
}

async function recordDelivery(input: {
  automationId: string;
  subscriberId?: string | null;
  email: string;
  phone?: string | null;
  channel: Automation["channel"];
  status: "scheduled" | "sent" | "failed" | "skipped";
  workerJobId?: string | null;
  error?: string | null;
  scheduledFor?: string | null;
}) {
  const supabase = getAdminClient();
  await supabase.from("automation_deliveries").upsert(
    {
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
    },
    { onConflict: "automation_id,email" },
  );
}

async function scheduleChainedFromParent(
  parentAutomationId: string,
  parentSendAt: string,
  ctx: AutomationRunContext,
): Promise<void> {
  const supabase = getAdminClient();
  const [{ data: segmentRows }, { data: groupRows }] = await Promise.all([
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);
  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];

  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("enabled", true)
    .eq("after_automation_id", parentAutomationId);

  const parentAt = new Date(parentSendAt);
  for (const rule of (data as Automation[]) ?? []) {
    const email = ctx.email.trim().toLowerCase();
    if (!passesNewSubscriberGate(rule, ctx)) continue;
    if (!passesPurchaseSegmentEntryGate(rule, ctx, segments, groups)) continue;
    if (!segmentMatches(rule, ctx.tags ?? [], segments, groups)) continue;
    if (
      rule.trigger_event === "purchase" &&
      !automationMatchesPurchaseProducts(rule, ctx.purchasedProductIds ?? [])
    ) {
      continue;
    }
    if (
      rule.trigger_event !== "purchase" &&
      !automationMatchesSignupSource(rule, ctx.source)
    ) {
      continue;
    }
    if (await alreadyQueuedOrSent(rule.id, email)) continue;
    try {
      const sendAt = computeChainedSendAt(rule, parentAt);
      const sendNow = new Date(sendAt).getTime() <= Date.now() + 1000;
      if (sendNow) {
        const sent = await sendAutomationNow(rule, ctx);
        if (sent) {
          await scheduleChainedFromParent(
            rule.id,
            new Date().toISOString(),
            ctx,
          );
        }
      } else {
        await scheduleAutomation(rule, ctx, sendAt);
        await scheduleChainedFromParent(rule.id, sendAt, ctx);
      }
    } catch (err) {
      console.error(`[automation] chain ${rule.id}:`, err);
    }
  }
}

async function scheduleAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
  sendAt: string,
): Promise<boolean> {
  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) {
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      channel: automation.channel,
      status: "skipped",
      error: "Unsubscribed",
    });
    return false;
  }
  const locale: Locale = ctx.locale === "en" ? "en" : "bg";
  const key = idempotencyKey(automation.id, {
    email,
    subscriberId: ctx.subscriberId,
  });

  if (automation.channel === "sms") {
    const phone = ctx.phone?.trim();
    if (!phone) {
      await recordDelivery({
        automationId: automation.id,
        subscriberId: ctx.subscriberId,
        email,
        channel: "sms",
        status: "skipped",
        error: "No phone number",
      });
      return false;
    }
    const body = renderEmailTemplate(
      locale === "en" ? automation.sms_en : automation.sms_bg,
      { name: ctx.name, email },
    );
    if (!body.trim()) return false;

    const res = await scheduleSms({
      body,
      recipients: [phone],
      sendAt,
      idempotencyKey: key,
    });
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      phone,
      channel: "sms",
      status: "scheduled",
      workerJobId: res.jobId,
      scheduledFor: sendAt,
    });
    await scheduleChainedFromParent(automation.id, sendAt, ctx);
    return true;
  }

  const subjectRaw =
    locale === "en" ? automation.subject_en : automation.subject_bg;
  const htmlRaw = locale === "en" ? automation.html_en : automation.html_bg;
  if (!subjectRaw.trim() || !htmlRaw.trim()) return false;

  const subject = renderEmailTemplate(subjectRaw, { name: ctx.name, email });
  const renderedHtml = renderEmailTemplate(htmlRaw, { name: ctx.name, email });
  const attachmentPath =
    locale === "en" ? automation.attachment_path_en : automation.attachment_path_bg;
  const attachmentFilename =
    locale === "en"
      ? automation.attachment_filename_en
      : automation.attachment_filename_bg;
  const { bodyHtml, attachments } = await buildEmailBodyForRecipient({
    html: renderedHtml,
    locale,
    email,
    subscriberId: ctx.subscriberId,
    attachmentPath,
    attachmentFilename,
  });
  const ctaLabel = locale === "en" ? automation.cta_label_en : automation.cta_label_bg;
  const ctaUrl = locale === "en" ? automation.cta_url_en : automation.cta_url_bg;
  const ctaHref =
    ctaLabel?.trim() && ctaUrl?.trim()
      ? automationCtaRedirectUrl(
          automation.id,
          locale,
          email,
          ctx.subscriberId ?? undefined,
        )
      : null;
  const heroImageUrl =
    locale === "en" ? automation.hero_image_url_en : automation.hero_image_url_bg;
  const html = await buildBrandedEmail({
    bodyHtml,
    locale,
    cta: ctaHref
      ? { label: ctaLabel.trim(), href: ctaHref }
      : null,
    vars: { name: ctx.name, email },
    unsubscribeHref: unsubscribeLinkForEmail(email, locale),
    heroImageUrl,
  });

  const res = await scheduleEmail({
    subject,
    html,
    recipients: [email],
    sendAt,
    idempotencyKey: key,
    attachments,
  });
  await recordDelivery({
    automationId: automation.id,
    subscriberId: ctx.subscriberId,
    email,
    phone: ctx.phone,
    channel: "email",
    status: "scheduled",
    workerJobId: res.jobId,
    scheduledFor: sendAt,
  });
  await scheduleChainedFromParent(automation.id, sendAt, ctx);
  return true;
}

async function sendAutomationNow(
  automation: Automation,
  ctx: AutomationRunContext,
): Promise<boolean> {
  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) {
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      channel: automation.channel,
      status: "skipped",
      error: "Unsubscribed",
    });
    return false;
  }
  const locale: Locale = ctx.locale === "en" ? "en" : "bg";

  if (automation.channel === "sms") {
    const phone = ctx.phone?.trim();
    if (!phone) {
      await recordDelivery({
        automationId: automation.id,
        subscriberId: ctx.subscriberId,
        email,
        channel: "sms",
        status: "skipped",
        error: "No phone number",
      });
      return false;
    }
    const body = renderEmailTemplate(
      locale === "en" ? automation.sms_en : automation.sms_bg,
      { name: ctx.name, email },
    );
    if (!body.trim()) return false;

    const res = await sendSms({
      body,
      recipients: [phone],
      idempotencyKey: idempotencyKey(automation.id, {
        email,
        subscriberId: ctx.subscriberId,
      }),
    });
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      phone,
      channel: "sms",
      status: "sent",
      workerJobId: res.jobId,
    });
    return true;
  }

  const subjectRaw =
    locale === "en" ? automation.subject_en : automation.subject_bg;
  const htmlRaw = locale === "en" ? automation.html_en : automation.html_bg;
  if (!subjectRaw.trim() || !htmlRaw.trim()) return false;

  const subject = renderEmailTemplate(subjectRaw, { name: ctx.name, email });
  const renderedHtml = renderEmailTemplate(htmlRaw, { name: ctx.name, email });
  const attachmentPath =
    locale === "en" ? automation.attachment_path_en : automation.attachment_path_bg;
  const attachmentFilename =
    locale === "en"
      ? automation.attachment_filename_en
      : automation.attachment_filename_bg;
  const { bodyHtml, attachments } = await buildEmailBodyForRecipient({
    html: renderedHtml,
    locale,
    email,
    subscriberId: ctx.subscriberId,
    attachmentPath,
    attachmentFilename,
  });
  const ctaLabel = locale === "en" ? automation.cta_label_en : automation.cta_label_bg;
  const ctaUrl = locale === "en" ? automation.cta_url_en : automation.cta_url_bg;
  const ctaHref =
    ctaLabel?.trim() && ctaUrl?.trim()
      ? automationCtaRedirectUrl(
          automation.id,
          locale,
          email,
          ctx.subscriberId ?? undefined,
        )
      : null;
  const heroImageUrl =
    locale === "en" ? automation.hero_image_url_en : automation.hero_image_url_bg;
  const html = await buildBrandedEmail({
    bodyHtml,
    locale,
    cta: ctaHref
      ? { label: ctaLabel.trim(), href: ctaHref }
      : null,
    vars: { name: ctx.name, email },
    unsubscribeHref: unsubscribeLinkForEmail(email, locale),
    heroImageUrl,
  });

  const res = await sendEmail({ subject, html, recipients: [email], attachments });
  await recordDelivery({
    automationId: automation.id,
    subscriberId: ctx.subscriberId,
    email,
    phone: ctx.phone,
    channel: "email",
    status: "sent",
    workerJobId: res.jobId,
  });
  return true;
}

async function passesAutomationGates(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
  opts?: { fromChain?: boolean },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const email = ctx.email.trim().toLowerCase();
  const tags = ctx.tags ?? [];

  if (!passesNewSubscriberGate(automation, ctx)) {
    return { ok: false, reason: "new_subscribers_only" };
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
    automation.trigger_event !== "purchase" &&
    !automationMatchesSignupSource(automation, ctx.source)
  ) {
    return { ok: false, reason: `signup_source (${ctx.source ?? "∅"})` };
  }
  if (await alreadyQueuedOrSent(automation.id, email)) {
    return { ok: false, reason: "already_queued_or_sent" };
  }

  if (automation.after_automation_id) {
    const gotPrior = await alreadyQueuedOrSent(
      automation.after_automation_id,
      email,
    );
    if (!gotPrior) {
      return { ok: false, reason: "waiting_for_parent_automation" };
    }
    const hasRelativeDelay =
      (automation.delay_days ?? 0) > 0 || (automation.delay_minutes ?? 0) > 0;
    if (hasRelativeDelay && !opts?.fromChain) {
      return { ok: false, reason: "chained_delay_not_from_parent" };
    }
  }

  return { ok: true };
}

async function executeAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
  opts?: { fromChain?: boolean },
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();

  if (!(await passesAutomationGates(automation, ctx, segments, groups, opts)).ok) {
    return;
  }

  try {
    const sendAt = computeAutomationSendAt(automation);
    const sendNow =
      !automation.send_date &&
      (automation.delay_days ?? 0) === 0 &&
      (automation.delay_minutes ?? 0) === 0 &&
      new Date(sendAt).getTime() <= Date.now() + 1000;

    if (sendNow) {
      const sent = await sendAutomationNow(automation, ctx);
      if (sent) {
        await scheduleChainedFromParent(
          automation.id,
          new Date().toISOString(),
          ctx,
        );
      }
      return;
    }

    await scheduleAutomation(automation, ctx, sendAt);
  } catch (err) {
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      phone: ctx.phone,
      channel: automation.channel,
      status: "failed",
      error: err instanceof Error ? err.message : "Send failed",
    });
  }
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
  const events = resolveTriggerEvents(source, ctx.isNew);
  report.triggerEvents = events;
  if (events.length === 0) {
    console.info(
      `[automation] no trigger for source=${source} isNew=${ctx.isNew} email=${email}`,
    );
    report.errors.push("no_trigger_for_source");
    return report;
  }

  const supabase = getAdminClient();
  const [{ data, error }, { data: segmentRows }, { data: groupRows }] = await Promise.all([
    supabase
      .from("automations")
      .select("*")
      .eq("enabled", true)
      .in("trigger_event", events as unknown as AutomationTrigger[])
      .order("sort_order", { ascending: true }),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);

  if (error) {
    console.error("[automation] load rules:", error.message);
    report.errors.push(`load_rules: ${error.message}`);
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

  const smsRules: Automation[] = [];
  const emailRules: Automation[] = [];

  for (const rule of rules) {
    const gate = await passesAutomationGates(rule, ctx, segments, groups);
    if (!gate.ok) {
      report.skipped.push({ name: rule.name, reason: gate.reason });
      console.info(`[automation] skip ${rule.name}: ${gate.reason}`);
      continue;
    }
    if (rule.channel === "sms") smsRules.push(rule);
    else emailRules.push(rule);
  }

  report.matchedEmail = emailRules.length;

  if (rules.length > 0 && emailRules.length === 0 && smsRules.length === 0) {
    console.warn(
      `[automation] ${rules.length} enabled rule(s) for ${events.join(",")} but none matched ${email} (tags=${(ctx.tags ?? []).join(",") || "∅"})`,
    );
  }

  if (emailRules.length > 0) {
    const settled = await Promise.allSettled(
      emailRules.map((rule) => prepareEmailAutomationJob(rule, ctx)),
    );
    const prepared: NonNullable<Awaited<ReturnType<typeof prepareEmailAutomationJob>>>[] =
      [];

    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i];
      const rule = emailRules[i];
      if (result.status === "fulfilled" && result.value) {
        prepared.push(result.value);
        continue;
      }
      const message =
        result.status === "rejected"
          ? result.reason instanceof Error
            ? result.reason.message
            : "prepare_failed"
          : "empty_subject_or_body";
      report.skipped.push({ name: rule.name, reason: message });
      if (result.status === "rejected") {
        report.errors.push(`${rule.name}: ${message}`);
      }
    }

    report.prepared = prepared.length;

    if (emailRules.length > 0 && prepared.length === 0) {
      console.warn(
        `[automation] ${emailRules.length} email rule(s) matched but none could be prepared for ${email}`,
      );
    }

    if (prepared.length > 0) {
      try {
        const batch = await submitEmailJobsBatch(
          prepared.map((job) => ({
            subject: job.subject,
            html: job.html,
            recipients: job.recipients,
            sendAt: job.sendAt,
            idempotencyKey: job.idempotencyKey,
            attachments: job.attachments,
          })),
        );

        console.info(
          `[automation] batch ${prepared.length} email(s) for ${email} → worker`,
        );

        report.submitted = batch.results.length;

        for (const item of batch.results) {
          const automationId = automationIdFromIdempotencyKey(item.idempotencyKey);
          if (!automationId) continue;

          const status = deliveryStatusFromWorkerResult(item);

          await recordDelivery({
            automationId,
            subscriberId: ctx.subscriberId,
            email,
            phone: ctx.phone,
            channel: "email",
            status,
            workerJobId: item.jobId || null,
            error: item.error ?? (status === "failed" ? `Worker status: ${item.status}` : null),
            scheduledFor: status === "scheduled" ? item.sendAt : null,
          });

          if (status === "sent" || status === "scheduled") {
            await scheduleChainedFromParent(automationId, item.sendAt, ctx);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Batch send failed";
        console.error("[automation] email batch:", message);
        report.errors.push(message);
        // Per-job fallback when batch endpoint is missing or rejects the payload.
        for (const job of prepared) {
          try {
            const sendNow = new Date(job.sendAt).getTime() <= Date.now() + 1000;
            const res = sendNow
              ? await sendEmail({
                  subject: job.subject,
                  html: job.html,
                  recipients: job.recipients,
                  attachments: job.attachments,
                })
              : await scheduleEmail({
                  subject: job.subject,
                  html: job.html,
                  recipients: job.recipients,
                  sendAt: job.sendAt,
                  idempotencyKey: job.idempotencyKey,
                  attachments: job.attachments,
                });
            const item = {
              idempotencyKey: job.idempotencyKey,
              jobId: res.jobId,
              status: res.status,
              sendAt: job.sendAt,
              dispatch: sendNow ? "immediate" : undefined,
              sent: res.sent,
              failed: res.failed,
            };
            const status = deliveryStatusFromWorkerResult(item);
            report.submitted += 1;
            await recordDelivery({
              automationId: job.automationId,
              subscriberId: ctx.subscriberId,
              email,
              phone: ctx.phone,
              channel: "email",
              status,
              workerJobId: res.jobId,
              scheduledFor: status === "scheduled" ? job.sendAt : null,
            });
            if (status === "sent" || status === "scheduled") {
              await scheduleChainedFromParent(job.automationId, job.sendAt, ctx);
            }
          } catch (jobErr) {
            const jobMessage =
              jobErr instanceof Error ? jobErr.message : "Send failed";
            report.errors.push(`${job.automationName}: ${jobMessage}`);
            await recordDelivery({
              automationId: job.automationId,
              subscriberId: ctx.subscriberId,
              email,
              phone: ctx.phone,
              channel: "email",
              status: "failed",
              error: jobMessage,
            });
          }
        }
      }
    }
  }

  for (const rule of smsRules) {
    try {
      await executeAutomation(rule, ctx, segments, groups);
    } catch (err) {
      const message = err instanceof Error ? err.message : "SMS send failed";
      report.errors.push(`${rule.name}: ${message}`);
      console.error(`[automation] sms rule ${rule.id}:`, err);
    }
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
  enabledRulesForTrigger: number;
  wouldSendCount: number;
  rules: AutomationDiagnosisRule[];
  notes: string[];
};

/**
 * Dry-run: evaluate every enabled automation for this context WITHOUT sending.
 * Explains, per rule, whether it would fire and why not. Used by admin diagnostics.
 */
export async function diagnoseAutomations(
  ctx: AutomationRunContext,
): Promise<AutomationDiagnosis> {
  const cfg = getNotificationWorkerConfig();
  const email = ctx.email.trim().toLowerCase();
  const source = ctx.source ?? "popup";
  const events = resolveTriggerEvents(source, ctx.isNew);
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
    return diagnosis;
  }

  if (events.length === 0) {
    notes.push(
      `source="${source}" не задейства нищо (не е разпознат като записване или покупка).`,
    );
    return diagnosis;
  }

  const supabase = getAdminClient();
  const [{ data, error }, { data: segmentRows }, { data: groupRows }] = await Promise.all([
    supabase
      .from("automations")
      .select("*")
      .eq("enabled", true)
      .in("trigger_event", events as unknown as AutomationTrigger[])
      .order("sort_order", { ascending: true }),
    supabase.from("segments").select("*"),
    supabase.from("segment_groups").select("*"),
  ]);

  if (error) {
    notes.push(`Грешка при зареждане на автоматизациите: ${error.message}`);
    return diagnosis;
  }

  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];
  const rules = (data as Automation[]) ?? [];
  diagnosis.enabledRulesForTrigger = rules.length;

  if (rules.length === 0) {
    notes.push(
      `Няма включени (enabled) автоматизации за тригер ${events.join(", ")}.`,
    );
    return diagnosis;
  }

  for (const rule of rules) {
    const gate = await passesAutomationGates(rule, ctx, segments, groups);
    const locale: Locale = ctx.locale === "en" ? "en" : "bg";
    const subjectRaw = locale === "en" ? rule.subject_en : rule.subject_bg;
    const htmlRaw = locale === "en" ? rule.html_en : rule.html_bg;
    const emptyContent =
      rule.channel === "email" && (!subjectRaw?.trim() || !htmlRaw?.trim());

    const wouldSend = gate.ok && !emptyContent;
    if (wouldSend) diagnosis.wouldSendCount += 1;

    diagnosis.rules.push({
      name: rule.name,
      enabled: rule.enabled,
      channel: rule.channel,
      triggerEvent: rule.trigger_event,
      wouldSend,
      reason: gate.ok
        ? emptyContent
          ? `празно съдържание за ${locale.toUpperCase()} (subject/body)`
          : "ще изпрати"
        : gate.reason,
      emptyContent,
    });
  }

  if (diagnosis.wouldSendCount === 0) {
    notes.push(
      "Нито една автоматизация не би се изпратила — виж причините по-долу.",
    );
  }

  return diagnosis;
}
