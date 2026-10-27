import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/worker/email";
import { publicSiteOrigin } from "@/lib/site";
import { formatScheduledAt } from "@/lib/datetime";
import { labelSignupSource } from "@/lib/automation/signup-sources";
import { formatSubmissionAnswers } from "@/lib/forms/format-answers";
import type { FormSubmissionRecord, FormTemplateRecord } from "@/lib/forms/types";
import {
  canReceiveAdminNotification,
  normalizeNotificationEmail,
  type AdminNotificationKind,
} from "@/lib/admin/notification-preferences";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function notificationHtml(
  title: string,
  rows: { label: string; value: string }[],
  path: string,
): string {
  const href = escapeHtml(`${publicSiteOrigin()}${path}`);
  return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f7fbf7;font-family:Arial,Helvetica,sans-serif;color:#1a2e1a">
<div style="max-width:600px;margin:0 auto;padding:24px;background:#fff;border-radius:12px">
<p style="color:#5a7a5a;font-size:13px">Healthy &amp; Confident · известие за екипа</p>
<h1 style="font-size:22px">${escapeHtml(title)}</h1>
<table style="width:100%;border-collapse:collapse">${rows.map((row) => `<tr>
<th scope="row" style="padding:10px 12px 10px 0;border-bottom:1px solid #e5ece5;text-align:left;vertical-align:top;width:35%;font-size:14px">${escapeHtml(row.label)}</th>
<td style="padding:10px 0;border-bottom:1px solid #e5ece5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px">${escapeHtml(row.value)}</td></tr>`).join("")}</table>
<p style="margin-top:24px"><a href="${href}" style="color:#2d7a47;font-weight:bold">Отвори в администрацията</a></p>
<p style="color:#5a7a5a;font-size:12px">Получаваш този имейл, защото известията са включени за профила ти. Главният админ може да ги промени от „Профили и промени“.</p>
</div></body></html>`;
}

/** Notification failures never turn an already saved enquiry into a failed form. */
async function notifyTeam(input: {
  kind: AdminNotificationKind;
  idempotencyKey: string;
  subject: string;
  rows: () => { label: string; value: string }[];
  path: string;
}) {
  try {
    const { data, error } = await getAdminClient()
      .from("admin_users")
      .select("notification_email, role, screens")
      .eq("active", true)
      .eq(input.kind, true)
      .not("notification_email", "is", null)
      .retry(false)
      .abortSignal(AbortSignal.timeout(6000));
    if (error) throw new Error(error.message);

    // Recheck access at send time: revoked access must stop these emails too.
    const recipients = [...new Set((data ?? [])
      .filter((user) => canReceiveAdminNotification(user, input.kind))
      .map((user) => normalizeNotificationEmail(user.notification_email))
      .filter((email): email is string => email !== null))];
    if (recipients.length === 0) return;

    const result = await sendEmail({
      subject: input.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      html: notificationHtml(input.subject, input.rows(), input.path),
      recipients,
      idempotencyKey: input.idempotencyKey,
      // Leave time for the form response and its other automations on Vercel.
      signal: AbortSignal.timeout(10_000),
    });
    if (!result.jobId) throw new Error("Worker did not return a notification job ID");
    if (result.status === "failed" || (result.failed ?? 0) > 0) {
      console.error(`[admin-notifications] ${input.idempotencyKey}: worker reported failed delivery`);
    }
  } catch (error) {
    console.error(`[admin-notifications] ${input.idempotencyKey}:`, error instanceof Error ? error.message : error);
  }
}

export async function notifyFormSubmission(input: {
  form: Pick<FormTemplateRecord, "id" | "name" | "title_bg" | "title_en" | "fields">;
  submission: Pick<FormSubmissionRecord, "id" | "email" | "answers" | "submitted_at">;
}) {
  const { form, submission } = input;
  await notifyTeam({
    kind: "notify_form_submissions",
    idempotencyKey: `admin-form-submission:${submission.id}`,
    subject: `Ново запитване: ${form.title_bg || form.name || form.title_en}`,
    rows: () => [
      { label: "Форма", value: form.name },
      { label: "Имейл", value: submission.email || "—" },
      { label: "Получено на", value: formatScheduledAt(submission.submitted_at, "bg") },
      ...formatSubmissionAnswers(form.fields, submission.answers),
    ],
    path: `/admin/forms#form-${encodeURIComponent(form.id)}`,
  });
}

export async function notifyNewSubscriber(input: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
}) {
  await notifyTeam({
    kind: "notify_new_subscribers",
    idempotencyKey: `admin-new-subscriber:${input.id}`,
    subject: "Нов абонат от сайта",
    rows: () => [
      { label: "Имейл", value: input.email },
      ...(input.name ? [{ label: "Име", value: input.name }] : []),
      ...(input.phone ? [{ label: "Телефон", value: input.phone }] : []),
      { label: "Откъде се е записал", value: labelSignupSource(input.source) },
    ],
    path: "/admin/subscribers",
  });
}
