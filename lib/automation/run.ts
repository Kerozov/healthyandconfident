import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTrigger, Locale, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience } from "@/lib/automation/audience";
import { buildBrandedEmail } from "@/lib/email/compose";
import { buildEmailBodyForRecipient } from "@/lib/email/build-body";
import { automationCtaRedirectUrl } from "@/lib/email/cta-redirect";
import { unsubscribeLinkForEmail, isEmailUnsubscribed } from "@/lib/email/unsubscribe";
import { renderEmailTemplate } from "@/lib/automation/template";
import { scheduledAtAfterDays, scheduledAtOnDate } from "@/lib/datetime";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { sendEmail, scheduleEmail } from "@/lib/worker/email";
import { sendSms, scheduleSms } from "@/lib/worker/sms";

export type AutomationRunContext = {
  email: string;
  name?: string | null;
  phone?: string | null;
  locale?: Locale;
  subscriberId?: string | null;
  tags?: string[];
  isNew: boolean;
  source?: string;
};

function resolveTriggerEvents(
  source: string,
  isNew: boolean,
): AutomationTrigger[] {
  const events: AutomationTrigger[] = [];
  if (source === "purchase") events.push("purchase");
  if (isNew) {
    events.push("new_subscriber");
    if (source !== "purchase") events.push("registration");
  }
  return events;
}

function segmentMatches(
  automation: Automation,
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
): boolean {
  return subscriberMatchesAutomationAudience(automation, tags, segments, groups);
}

function sendAtAfterDays(
  days: number,
  sendTime: string,
  from?: Date,
): string {
  return scheduledAtAfterDays(days, sendTime || "09:00", from);
}

function sendAtNowOrLaterToday(sendTime: string, from?: Date): string {
  const now = from ? new Date(from) : new Date();
  const scheduled = scheduledAtAfterDays(0, sendTime || "09:00", now);
  if (new Date(scheduled).getTime() > now.getTime()) {
    return scheduled;
  }
  return now.toISOString();
}

function computeAutomationSendAt(
  automation: Automation,
  from?: Date,
): string {
  const sendTime = automation.send_time ?? "09:00";
  const now = from ? new Date(from) : new Date();

  if (automation.send_date) {
    const fixed = scheduledAtOnDate(automation.send_date, sendTime);
    if (new Date(fixed).getTime() > now.getTime()) {
      return fixed;
    }
    return now.toISOString();
  }

  const delayDays = automation.delay_days ?? 0;
  if (delayDays > 0) {
    return sendAtAfterDays(delayDays, sendTime, now);
  }
  return sendAtNowOrLaterToday(sendTime, now);
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
    if (rule.new_subscribers_only && !ctx.isNew) continue;
    if (!segmentMatches(rule, ctx.tags ?? [], segments, groups)) continue;
    if (await alreadyQueuedOrSent(rule.id, email)) continue;
    const childDelay = rule.delay_days ?? 0;
    try {
      if (childDelay > 0 || rule.send_date) {
        const sendAt = rule.send_date
          ? computeAutomationSendAt(rule, parentAt)
          : sendAtAfterDays(
              childDelay,
              rule.send_time ?? "09:00",
              parentAt,
            );
        await scheduleAutomation(rule, ctx, sendAt);
        await scheduleChainedFromParent(rule.id, sendAt, ctx);
      } else {
        const sent = await sendAutomationNow(rule, ctx);
        if (sent) {
          await scheduleChainedFromParent(rule.id, new Date().toISOString(), ctx);
        }
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

async function executeAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
  segments: Segment[],
  groups: SegmentGroup[],
  opts?: { fromChain?: boolean },
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();
  const tags = ctx.tags ?? [];

  if (automation.new_subscribers_only && !ctx.isNew) return;
  if (!segmentMatches(automation, tags, segments, groups)) return;
  if (await alreadyQueuedOrSent(automation.id, email)) return;

  if (automation.after_automation_id) {
    const gotPrior = await alreadyQueuedOrSent(
      automation.after_automation_id,
      email,
    );
    if (!gotPrior) return;
    if (automation.delay_days > 0 && !opts?.fromChain) return;
  }

  try {
    const sendAt = computeAutomationSendAt(automation);
    const sendNow =
      !automation.send_date &&
      (automation.delay_days ?? 0) === 0 &&
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
  if (!isNotificationWorkerConfigured()) return;

  const email = ctx.email.trim().toLowerCase();
  if (await isEmailUnsubscribed(email)) return;

  const source = ctx.source ?? "popup";
  const events = resolveTriggerEvents(source, ctx.isNew);
  if (events.length === 0) return;

  const supabase = getAdminClient();
  const [{ data, error }, { data: segmentRows }, { data: groupRows }] = await Promise.all([
    supabase
      .from("automations")
      .select("*")
      .eq("enabled", true)
      .in("trigger_event", events)
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
  for (const rule of rules) {
    try {
      await executeAutomation(rule, ctx, segments, groups);
    } catch (err) {
      console.error(`[automation] rule ${rule.id}:`, err);
    }
  }
}

export async function runAutomationsForSubscriber(
  ctx: AutomationRunContext,
): Promise<void> {
  return runAutomations(ctx);
}
