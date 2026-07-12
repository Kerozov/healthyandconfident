import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTrigger, Locale, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience, automationMatchesPurchaseProducts } from "@/lib/automation/audience";
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
  prepareEmailAutomationJob,
} from "@/lib/automation/prepare-email";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
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
  if (isSiteSignupSource(source)) return ["new_subscriber", "registration"];
  if (isNew) return ["new_subscriber", "registration"];
  return [];
}

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

  // A parent group that contains ALL interests must not pull every interest drip.
  // Only a direct segment_key (e.g. weight-loss) targets that interest.
  if (audienceHealth.length > 1 && directHealth.length === 0) {
    return false;
  }

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

function idempotencyKey(automationId: string, email: string): string {
  return `auto-${automationId}-${email}`;
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
  const key = idempotencyKey(automation.id, email);

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
  const html = await buildBrandedEmail({
    bodyHtml,
    locale,
    cta: ctaHref
      ? { label: ctaLabel.trim(), href: ctaHref }
      : null,
    vars: { name: ctx.name, email },
    unsubscribeHref: unsubscribeLinkForEmail(email, locale),
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
      idempotencyKey: idempotencyKey(automation.id, email),
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
  const html = await buildBrandedEmail({
    bodyHtml,
    locale,
    cta: ctaHref
      ? { label: ctaLabel.trim(), href: ctaHref }
      : null,
    vars: { name: ctx.name, email },
    unsubscribeHref: unsubscribeLinkForEmail(email, locale),
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
): Promise<boolean> {
  const email = ctx.email.trim().toLowerCase();
  const tags = ctx.tags ?? [];

  if (!passesNewSubscriberGate(automation, ctx)) {
    console.info(`[automation] skip ${automation.name}: new_subscribers_only`);
    return false;
  }
  if (!passesPurchaseSegmentEntryGate(automation, ctx, segments, groups)) {
    console.info(`[automation] skip ${automation.name}: purchase segment gate`);
    return false;
  }
  if (!segmentMatches(automation, tags, segments, groups)) {
    console.info(
      `[automation] skip ${automation.name}: audience (tags=${tags.join(",") || "∅"})`,
    );
    return false;
  }
  if (
    automation.trigger_event === "purchase" &&
    !automationMatchesPurchaseProducts(automation, ctx.purchasedProductIds ?? [])
  ) {
    console.info(`[automation] skip ${automation.name}: product filter`);
    return false;
  }
  if (await alreadyQueuedOrSent(automation.id, email)) {
    console.info(`[automation] skip ${automation.name}: already queued/sent`);
    return false;
  }

  if (automation.after_automation_id) {
    const gotPrior = await alreadyQueuedOrSent(
      automation.after_automation_id,
      email,
    );
    if (!gotPrior) return false;
    const hasRelativeDelay =
      (automation.delay_days ?? 0) > 0 || (automation.delay_minutes ?? 0) > 0;
    if (hasRelativeDelay && !opts?.fromChain) return false;
  }

  return true;
}

async function executeAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
  opts?: { fromChain?: boolean },
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();

  if (!(await passesAutomationGates(automation, ctx, segments, groups, opts))) {
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
export async function runAutomations(ctx: AutomationRunContext): Promise<void> {
  if (!isNotificationWorkerConfigured()) {
    console.error(
      "[automation] skipped: NOTIFICATION_WORKER_URL / API_KEY not configured",
    );
    return;
  }

  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) return;

  const source = ctx.source ?? "popup";
  const events = resolveTriggerEvents(source, ctx.isNew);
  if (events.length === 0) {
    console.info(
      `[automation] no trigger for source=${source} isNew=${ctx.isNew} email=${email}`,
    );
    return;
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
    return;
  }

  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];
  const rules = (data as Automation[]) ?? [];
  if (rules.length === 0) {
    console.info(
      `[automation] no enabled rules for triggers=${events.join(",")} email=${email}`,
    );
    return;
  }

  const smsRules: Automation[] = [];
  const emailRules: Automation[] = [];

  for (const rule of rules) {
    if (!(await passesAutomationGates(rule, ctx, segments, groups))) continue;
    if (rule.channel === "sms") smsRules.push(rule);
    else emailRules.push(rule);
  }

  if (emailRules.length > 0) {
    const prepared = (
      await Promise.all(
        emailRules.map((rule) => prepareEmailAutomationJob(rule, ctx)),
      )
    ).filter((job) => job !== null);

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

        for (const item of batch.results) {
          const automationId = automationIdFromIdempotencyKey(item.idempotencyKey);
          if (!automationId) continue;

          const isSent =
            item.status === "sent" ||
            item.dispatch === "immediate" ||
            (item.sent ?? 0) > 0;
          const status = item.error
            ? "failed"
            : isSent
              ? "sent"
              : "scheduled";

          await recordDelivery({
            automationId,
            subscriberId: ctx.subscriberId,
            email,
            phone: ctx.phone,
            channel: "email",
            status,
            workerJobId: item.jobId || null,
            error: item.error ?? null,
            scheduledFor: status === "scheduled" ? item.sendAt : null,
          });

          if (status === "sent" || status === "scheduled") {
            await scheduleChainedFromParent(automationId, item.sendAt, ctx);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Batch send failed";
        console.error("[automation] email batch:", message);
        for (const job of prepared) {
          await recordDelivery({
            automationId: job.automationId,
            subscriberId: ctx.subscriberId,
            email,
            phone: ctx.phone,
            channel: "email",
            status: "failed",
            error: message,
          });
        }
      }
    }
  }

  for (const rule of smsRules) {
    try {
      await executeAutomation(rule, ctx, segments, groups);
    } catch (err) {
      console.error(`[automation] sms rule ${rule.id}:`, err);
    }
  }
}

export async function runAutomationsForSubscriber(
  ctx: AutomationRunContext,
): Promise<void> {
  return runAutomations(ctx);
}
