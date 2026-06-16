import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { AutomationTrigger, Locale } from "@/lib/supabase/types";
import { renderEmailTemplate } from "@/lib/automation/template";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { sendEmail } from "@/lib/worker/email";

export type SendAutomatedEmailInput = {
  email: string;
  name?: string | null;
  locale?: Locale;
};

export async function sendAutomatedEmail(
  trigger: AutomationTrigger,
  input: SendAutomatedEmailInput,
): Promise<{ ok: boolean; reason?: string }> {
  if (!isNotificationWorkerConfigured()) {
    return { ok: false, reason: "worker_not_configured" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, reason: "missing_email" };

  const locale: Locale = input.locale === "en" ? "en" : "bg";
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("automated_emails")
    .select("enabled, subject, html")
    .eq("trigger", trigger)
    .eq("locale", locale)
    .maybeSingle();

  if (error) {
    console.error(`[automation] load ${trigger}/${locale}:`, error.message);
    return { ok: false, reason: "db_error" };
  }

  const row = data as { enabled: boolean; subject: string; html: string } | null;
  if (!row?.enabled) return { ok: false, reason: "disabled" };

  const subject = renderEmailTemplate(row.subject, {
    name: input.name,
    email,
  });
  const html = renderEmailTemplate(row.html, { name: input.name, email });

  if (!subject.trim() || !html.trim()) {
    return { ok: false, reason: "empty_template" };
  }

  try {
    await sendEmail({
      subject,
      html,
      recipients: [email],
    });
    return { ok: true };
  } catch (err) {
    console.error(`[automation] send ${trigger}/${locale}:`, err);
    return { ok: false, reason: "send_failed" };
  }
}

/** Call after a successful checkout (webhook or thank-you page). */
export async function sendPurchaseWelcomeEmail(
  input: SendAutomatedEmailInput,
): Promise<{ ok: boolean; reason?: string }> {
  return sendAutomatedEmail("purchase", input);
}

/** Call after a new newsletter / lead signup. */
export async function sendRegistrationWelcomeEmail(
  input: SendAutomatedEmailInput,
): Promise<{ ok: boolean; reason?: string }> {
  return sendAutomatedEmail("registration", input);
}
