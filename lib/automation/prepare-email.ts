import "server-only";

import type { Automation } from "@/lib/supabase/types";
import type { AutomationRunContext } from "@/lib/automation/run";
import { buildBrandedEmail } from "@/lib/email/compose";
import { buildEmailBodyForRecipient } from "@/lib/email/build-body";
import { automationCtaRedirectUrl } from "@/lib/email/cta-redirect";
import { unsubscribeLinkForEmail } from "@/lib/email/unsubscribe";
import { renderEmailTemplate } from "@/lib/automation/template";
import { automationEmailContent } from "@/lib/automation/content";
import { computeAutomationSendAt } from "@/lib/automation/send-at";
import { automationJobIdempotencyKey } from "@/lib/automation/idempotency";
import type { Locale } from "@/lib/supabase/types";

export type AutomationEmailAttachment = {
  filename: string;
  url: string;
  contentType: string;
};

/** Subject + finished HTML for one recipient — what the worker gets. */
export type AutomationEmailMessage = {
  subject: string;
  html: string;
  attachments?: AutomationEmailAttachment[];
};

export type PreparedEmailJob = AutomationEmailMessage & {
  automationId: string;
  automationName: string;
  recipients: string[];
  sendAt: string;
  idempotencyKey: string;
  sendNow: boolean;
};

/**
 * Render one automation email for one person. The batch, the single-job path
 * and the chain steps all build it here, so a step can never go out differently
 * depending on which path reached it. `null` only when there is no body in
 * either language (see automationEmailContent).
 */
export async function buildAutomationEmailMessage(
  automation: Automation,
  ctx: AutomationRunContext,
): Promise<AutomationEmailMessage | null> {
  const email = ctx.email.trim().toLowerCase();
  const locale: Locale = ctx.locale === "en" ? "en" : "bg";

  const content = automationEmailContent(automation, locale);
  if (!content) return null;

  const subject = renderEmailTemplate(content.subject, { name: ctx.name, email });
  const renderedHtml = renderEmailTemplate(content.html, { name: ctx.name, email });
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
    recipient: { email, subscriberId: ctx.subscriberId },
    includeSignature: automation.signature_enabled !== false,
  });

  return {
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
  };
}

/** Build one email job payload for the worker batch endpoint. */
export async function prepareEmailAutomationJob(
  automation: Automation,
  ctx: AutomationRunContext,
): Promise<PreparedEmailJob | null> {
  const message = await buildAutomationEmailMessage(automation, ctx);
  if (!message) return null;

  const email = ctx.email.trim().toLowerCase();
  const sendAt = computeAutomationSendAt(automation);
  const sendNow =
    !automation.send_date &&
    (automation.delay_days ?? 0) === 0 &&
    (automation.delay_minutes ?? 0) === 0 &&
    new Date(sendAt).getTime() <= Date.now() + 1000;

  return {
    ...message,
    automationId: automation.id,
    automationName: automation.name,
    recipients: [email],
    sendAt,
    idempotencyKey: automationJobIdempotencyKey(automation.id, {
      email,
      subscriberId: ctx.subscriberId,
    }),
    sendNow,
  };
}

export { automationIdFromIdempotencyKey } from "@/lib/automation/idempotency";
