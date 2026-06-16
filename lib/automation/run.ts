import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, AutomationTrigger, Locale } from "@/lib/supabase/types";
import { renderEmailTemplate } from "@/lib/automation/template";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { sendEmail } from "@/lib/worker/email";
import { sendSms } from "@/lib/worker/sms";

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

async function alreadyReceived(
  automationId: string,
  email: string,
): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id")
    .eq("automation_id", automationId)
    .eq("email", email)
    .maybeSingle();
  return Boolean(data);
}

async function recordDelivery(input: {
  automationId: string;
  subscriberId?: string | null;
  email: string;
  phone?: string | null;
  channel: Automation["channel"];
  status: "sent" | "failed" | "skipped";
  workerJobId?: string | null;
  error?: string | null;
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
      sent_at: new Date().toISOString(),
    },
    { onConflict: "automation_id,email" },
  );
}

async function executeAutomation(
  automation: Automation,
  ctx: AutomationRunContext,
): Promise<void> {
  const email = ctx.email.trim().toLowerCase();
  const locale: Locale = ctx.locale === "en" ? "en" : "bg";
  const tags = ctx.tags ?? [];

  if (automation.new_subscribers_only && !ctx.isNew) return;
  if (!segmentMatches(automation, tags)) return;

  if (await alreadyReceived(automation.id, email)) return;

  if (automation.after_automation_id) {
    const gotPrior = await alreadyReceived(automation.after_automation_id, email);
    if (!gotPrior) return;
  }

  if (automation.channel === "sms") {
    const phone = ctx.phone?.trim();
    if (!phone) {
      await recordDelivery({
        automationId: automation.id,
        subscriberId: ctx.subscriberId,
        email,
        phone: null,
        channel: "sms",
        status: "skipped",
        error: "No phone number",
      });
      return;
    }

    const body = renderEmailTemplate(
      locale === "en" ? automation.sms_en : automation.sms_bg,
      { name: ctx.name, email },
    );
    if (!body.trim()) return;

    try {
      const res = await sendSms({
        body,
        recipients: [phone],
        idempotencyKey: `auto-${automation.id}-${email}`,
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
    } catch (err) {
      await recordDelivery({
        automationId: automation.id,
        subscriberId: ctx.subscriberId,
        email,
        phone,
        channel: "sms",
        status: "failed",
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
    return;
  }

  const subjectRaw = locale === "en" ? automation.subject_en : automation.subject_bg;
  const htmlRaw = locale === "en" ? automation.html_en : automation.html_bg;
  if (!subjectRaw.trim() || !htmlRaw.trim()) return;

  const subject = renderEmailTemplate(subjectRaw, { name: ctx.name, email });
  const html = renderEmailTemplate(htmlRaw, { name: ctx.name, email });

  try {
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
  } catch (err) {
    await recordDelivery({
      automationId: automation.id,
      subscriberId: ctx.subscriberId,
      email,
      phone: ctx.phone,
      channel: "email",
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
