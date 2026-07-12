import "server-only";

import type { Automation } from "@/lib/supabase/types";
import type { AutomationRunContext } from "@/lib/automation/run";
import { buildBrandedEmail } from "@/lib/email/compose";
import { buildEmailBodyForRecipient } from "@/lib/email/build-body";
import { automationCtaRedirectUrl } from "@/lib/email/cta-redirect";
import { unsubscribeLinkForEmail } from "@/lib/email/unsubscribe";
import { renderEmailTemplate } from "@/lib/automation/template";
import { computeAutomationSendAt } from "@/lib/automation/send-at";
import { automationJobIdempotencyKey } from "@/lib/automation/idempotency";
import type { Locale } from "@/lib/supabase/types";

export type PreparedEmailJob = {
  automationId: string;
  automationName: string;
  subject: string;
  html: string;
  recipients: string[];
  sendAt: string;
  idempotencyKey: string;
  sendNow: boolean;
  attachments?: {
    filename: string;
    url: string;
    contentType: string;
  }[];
};

/** Build one email job payload for the worker batch endpoint. */
export async function prepareEmailAutomationJob(
  automation: Automation,
  ctx: AutomationRunContext,
): Promise<PreparedEmailJob | null> {
  const email = ctx.email.trim().toLowerCase();
  const locale: Locale = ctx.locale === "en" ? "en" : "bg";

  const subjectRaw =
    locale === "en" ? automation.subject_en : automation.subject_bg;
  const htmlRaw = locale === "en" ? automation.html_en : automation.html_bg;
  if (!subjectRaw.trim() || !htmlRaw.trim()) return null;

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

  const sendAt = computeAutomationSendAt(automation);
  const sendNow =
    !automation.send_date &&
    (automation.delay_days ?? 0) === 0 &&
    (automation.delay_minutes ?? 0) === 0 &&
    new Date(sendAt).getTime() <= Date.now() + 1000;

  return {
    automationId: automation.id,
    automationName: automation.name,
    subject,
    html,
    recipients: [email],
    sendAt,
    idempotencyKey: automationJobIdempotencyKey(automation.id, {
      email,
      subscriberId: ctx.subscriberId,
    }),
    sendNow,
    attachments: attachments.length ? attachments : undefined,
  };
}

export { automationIdFromIdempotencyKey } from "@/lib/automation/idempotency";
