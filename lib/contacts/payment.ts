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
  productIds?: string[];
  stripeProductIds?: string[];
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
        product_ids: input.productIds ?? [],
        stripe_product_ids: input.stripeProductIds ?? [],
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
  productIds?: string[];
  stripeProductIds?: string[];
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
    productIds: input.productIds,
    stripeProductIds: input.stripeProductIds,
  });

  return { remindersCanceled };
}

/** After a full Stripe refund — mark contact unpaid only if no other paid purchases remain (tags left intact). */
export async function markContactUnpaidByEmail(input: {
  email: string;
  stripeSessionId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
}): Promise<{ updated: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { updated: false };

  const supabase = getAdminClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("id, payment_status")
    .eq("email", email)
    .maybeSingle();

  if (!contact || (contact as Contact).payment_status !== "paid") {
    return { updated: false };
  }

  const contactId = (contact as Contact).id;

  let remainingQuery = supabase
    .from("subscriber_purchases")
    .select("id")
    .eq("email", email)
    .eq("payment_status", "paid")
    .limit(1);

  if (input.stripeSessionId) {
    remainingQuery = remainingQuery.neq("stripe_session_id", input.stripeSessionId);
  }

  const { data: remainingRows } = await remainingQuery;
  const stillHasPaid = (remainingRows?.length ?? 0) > 0;

  await recordContactEvent({
    contactId,
    eventType: "payment_refunded",
    source: "stripe",
    metadata: {
      stripe_session_id: input.stripeSessionId ?? null,
      amount_cents: input.amountCents ?? null,
      currency: input.currency ?? null,
      still_has_paid_purchase: stillHasPaid,
    },
  });

  if (stillHasPaid) {
    return { updated: false };
  }

  const now = new Date().toISOString();
  await supabase
    .from("contacts")
    .update({
      payment_status: "unpaid",
      paid_at: null,
      updated_at: now,
    })
    .eq("id", contactId);

  return { updated: true };
}
