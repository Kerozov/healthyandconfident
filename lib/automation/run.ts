import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTrigger, Locale } from "@/lib/supabase/types";
import { renderEmailTemplate } from "@/lib/automation/template";
import { scheduledAtAfterDays } from "@/lib/datetime";
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

function segmentMatches(automation: Automation, tags: string[]): boolean {
  const required = automation.segment_keys.filter(Boolean);
  if (required.length === 0) return true;
  return required.some((key) => tags.includes(key));
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
  delayDays: number,
  sendTime: string,
  from?: Date,
): string {
  if (delayDays > 0) {
    return sendAtAfterDays(delayDays, sendTime, from);
  }
  return sendAtNowOrLaterToday(sendTime, from);
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
  const { data } = await supabase
    .from("automations")
    .select("*")
    .eq("enabled", true)
    .eq("after_automation_id", parentAutomationId);

  const parentAt = new Date(parentSendAt);
  for (const rule of (data as Automation[]) ?? []) {
    const email = ctx.email.trim().toLowerCase();
    if (rule.new_subscribers_only && !ctx.isNew) continue;
    if (!segmentMatches(rule, ctx.tags ?? [])) continue;
    if (await alreadyQueuedOrSent(rule.id, email)) continue;
    const childDelay = rule.delay_days ?? 0;
    try {
      if (childDelay > 0) {
        const sendAt = sendAtAfterDays(
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
  const html = renderEmailTemplate(htmlRaw, { name: ctx.name, email });

  const res = await scheduleEmail({
    subject,
    html,
    recipients: [email],
    sendAt,
    idempotencyKey: key,
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
  const html = renderEmailTemplate(htmlRaw, { name: ctx.name, email });

  const res = await sendEmail({ subject, html, recipients: [email] });
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
  opts?: { fromChain?: boolean },
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();
  const tags = ctx.tags ?? [];

  if (automation.new_subscribers_only && !ctx.isNew) return;
  if (!segmentMatches(automation, tags)) return;
  if (await alreadyQueuedOrSent(automation.id, email)) return;

  if (automation.after_automation_id) {
    const gotPrior = await alreadyQueuedOrSent(
      automation.after_automation_id,
      email,
    );
    if (!gotPrior) return;
    if (automation.delay_days > 0 && !opts?.fromChain) return;
  }

  const delay = automation.delay_days ?? 0;
  const sendTime = automation.send_time ?? "09:00";

  try {
    const sendAt = computeAutomationSendAt(delay, sendTime);
    const sendNow =
      delay === 0 && new Date(sendAt).getTime() <= Date.now() + 1000;

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

  const source = ctx.source ?? "popup";
  const events = resolveTriggerEvents(source, ctx.isNew);
  if (events.length === 0) return;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("enabled", true)
    .in("trigger_event", events)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[automation] load rules:", error.message);
    return;
  }

  const rules = (data as Automation[]) ?? [];
  for (const rule of rules) {
    try {
      await executeAutomation(rule, ctx);
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
