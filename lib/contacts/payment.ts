import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { cancelContactReminders } from "@/lib/notification-worker";
import { recordContactEvent } from "@/lib/contacts/events";
import { ensureContactForSubscriber } from "@/lib/contacts/ensure";
import type { Contact } from "@/lib/contacts/types";

export type MarkContactPaidInput = {
  contactId: string;
  stripeSessionId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
};

/** Mark contact paid, record event, cancel pre-payment reminders. Idempotent. */
export async function markContactPaid(input: MarkContactPaidInput): Promise<{
  contact: Contact;
  remindersCanceled: number;
  alreadyPaid: boolean;
}> {
  const supabase = getAdminClient();
  const { data: row } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", input.contactId)
    .maybeSingle();

  if (!row) {
    throw new Error("Contact not found");
  }

  const contact = row as Contact;
  const alreadyPaid = contact.payment_status === "paid";

  if (!alreadyPaid) {
    const now = new Date().toISOString();
    await supabase
      .from("contacts")
      .update({
        payment_status: "paid",
        paid_at: now,
        last_stripe_session_id: input.stripeSessionId ?? null,
        updated_at: now,
      })
      .eq("id", input.contactId);

    await recordContactEvent({
      contactId: input.contactId,
      eventType: "payment_completed",
      source: "stripe",
      metadata: {
        stripe_session_id: input.stripeSessionId ?? null,
        amount_cents: input.amountCents ?? null,
        currency: input.currency ?? null,
      },
    });
  }

  const remindersCanceled = await cancelContactReminders(input.contactId);

  const { data: updated } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", input.contactId)
    .single();

  return {
    contact: (updated as Contact) ?? contact,
    remindersCanceled,
    alreadyPaid,
  };
}

export async function syncContactAfterPurchase(input: {
  subscriberId: string;
  email: string;
  name?: string | null;
  stripeSessionId: string;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<{ remindersCanceled: number }> {
  const contact = await ensureContactForSubscriber({
    subscriberId: input.subscriberId,
    email: input.email,
    name: input.name,
  });

  const { remindersCanceled } = await markContactPaid({
    contactId: contact.id,
    stripeSessionId: input.stripeSessionId,
    amountCents: input.amountCents,
    currency: input.currency,
  });

  return { remindersCanceled };
}
