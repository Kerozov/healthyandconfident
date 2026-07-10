import "server-only";

import { scheduledAtAfterDays } from "@/lib/datetime";
import { buildContactGoUrl } from "@/lib/contacts/go-url";
import { getAdminClient } from "@/lib/supabase/admin";
import { scheduleContactEmail } from "@/lib/notification-worker";
import {
  SEQUENCE_PRE_PAYMENT_REMINDERS,
  type Contact,
} from "@/lib/contacts/types";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

const REMINDER_OFFSETS_DAYS = [1, 3, 7] as const;

function reminderContent(input: {
  locale: "bg" | "en";
  name: string | null;
  ctaUrl: string;
  day: number;
}): { subject: string; html: string } {
  const greeting = input.name?.trim() || (input.locale === "bg" ? "здравей" : "there");

  if (input.locale === "en") {
    return {
      subject: `Reminder: your program spot (day ${input.day})`,
      html: `<p>Hi ${greeting},</p>
<p>Just a friendly reminder — you started signing up but haven't completed payment yet.</p>
<p><a href="${input.ctaUrl}">Complete your registration →</a></p>
<p>With love,<br/>Vessie</p>`,
    };
  }

  return {
    subject: `Напомняне: място в програмата (ден ${input.day})`,
    html: `<p>Здравей, ${greeting},</p>
<p>Кратко напомняне — започна записването, но плащането още не е завършено.</p>
<p><a href="${input.ctaUrl}">Завърши регистрацията →</a></p>
<p>С обич,<br/>Веси</p>`,
  };
}

/** Schedule pre-payment reminder sequence if contact is unpaid and none exist yet. */
export async function schedulePrePaymentReminders(
  contact: Contact,
  locale: "bg" | "en" = "bg",
): Promise<number> {
  if (contact.payment_status === "paid") return 0;
  if (!isNotificationWorkerConfigured()) return 0;

  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("contact_worker_jobs")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("sequence_key", SEQUENCE_PRE_PAYMENT_REMINDERS)
    .limit(1);

  if ((existing ?? []).length > 0) return 0;

  const checkoutPath = `/${locale}#programs`;
  let scheduled = 0;

  for (const day of REMINDER_OFFSETS_DAYS) {
    const sendAt = scheduledAtAfterDays(day, "09:00");
    const campaignId = `pre-payment-reminder-d${day}`;
    const idempotencyKey = `${SEQUENCE_PRE_PAYMENT_REMINDERS}-${contact.id}-d${day}`;

    const ctaUrl = buildContactGoUrl({
      contactId: contact.id,
      campaignId,
      to: checkoutPath,
    });

    const { subject, html } = reminderContent({
      locale,
      name: contact.name,
      ctaUrl,
      day,
    });

    const result = await scheduleContactEmail({
      contactId: contact.id,
      sequenceKey: SEQUENCE_PRE_PAYMENT_REMINDERS,
      subject,
      html,
      recipients: [contact.email],
      sendAt,
      idempotencyKey,
    });

    if (result) scheduled += 1;
  }

  return scheduled;
}
