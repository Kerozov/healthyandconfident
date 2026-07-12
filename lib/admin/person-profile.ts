import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Contact, ContactEvent } from "@/lib/contacts/types";
import { formatSubmissionAnswers } from "@/lib/forms/format-answers";
import type { FormField } from "@/lib/forms/types";

export type ContactSummary = {
  contactId: string | null;
  paymentStatus: "paid" | "unpaid" | null;
  paidAt: string | null;
  zoomAttended: boolean;
  zoomTotalMinutes: number;
  zoomLastJoinedAt: string | null;
  zoomLastLeftAt: string | null;
};

export type PersonPurchase = {
  productTitle: string;
  productId: string | null;
  stripeProductId: string | null;
  paymentStatus: "paid" | "refunded" | "failed";
  amountCents: number | null;
  currency: string | null;
  purchasedAt: string;
};

export type PersonFormSubmission = {
  formName: string;
  submittedAt: string;
  rows: { label: string; value: string }[];
};

export type PersonZoomSession = {
  joinedAt: string | null;
  leftAt: string;
  durationMinutes: number;
  meetingId: string | null;
};

const EMPTY_CONTACT: ContactSummary = {
  contactId: null,
  paymentStatus: null,
  paidAt: null,
  zoomAttended: false,
  zoomTotalMinutes: 0,
  zoomLastJoinedAt: null,
  zoomLastLeftAt: null,
};

export async function getContactSummariesForEmails(
  emails: string[],
): Promise<Map<string, ContactSummary>> {
  const map = new Map<string, ContactSummary>();
  const normalized = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  for (const email of normalized) {
    map.set(email, { ...EMPTY_CONTACT });
  }
  if (normalized.length === 0) return map;

  const supabase = getAdminClient();
  const { data } = await supabase
    .from("contacts")
    .select(
      "id, email, payment_status, paid_at, zoom_attended, zoom_total_minutes, zoom_last_joined_at, zoom_last_left_at",
    )
    .in("email", normalized);

  for (const row of (data as Contact[] | null) ?? []) {
    map.set(row.email.toLowerCase(), {
      contactId: row.id,
      paymentStatus: row.payment_status,
      paidAt: row.paid_at,
      zoomAttended: row.zoom_attended,
      zoomTotalMinutes: row.zoom_total_minutes ?? 0,
      zoomLastJoinedAt: row.zoom_last_joined_at,
      zoomLastLeftAt: row.zoom_last_left_at,
    });
  }

  return map;
}

function zoomSessionsFromEvents(events: ContactEvent[]): PersonZoomSession[] {
  const sessions: PersonZoomSession[] = [];

  for (const event of events) {
    if (event.event_type !== "zoom_left") continue;
    const meta = event.metadata ?? {};
    sessions.push({
      joinedAt:
        typeof meta.join_time === "string"
          ? meta.join_time
          : null,
      leftAt:
        typeof meta.leave_time === "string"
          ? meta.leave_time
          : event.created_at,
      durationMinutes:
        typeof meta.duration_minutes === "number" ? meta.duration_minutes : 0,
      meetingId:
        typeof meta.meeting_id === "string" ? meta.meeting_id : null,
    });
  }

  return sessions;
}

export async function getPersonProfile(email: string): Promise<{
  contact: ContactSummary;
  purchases: PersonPurchase[];
  formSubmissions: PersonFormSubmission[];
  zoomSessions: PersonZoomSession[];
}> {
  const normalized = email.trim().toLowerCase();
  const contactMap = await getContactSummariesForEmails([normalized]);
  const contact = contactMap.get(normalized) ?? { ...EMPTY_CONTACT };

  const supabase = getAdminClient();

  const [
    { data: purchaseRows },
    { data: submissionRows },
    { data: eventRows },
  ] = await Promise.all([
    supabase
      .from("subscriber_purchases")
      .select(
        "purchased_at, product_id, stripe_product_id, payment_status, amount_cents, currency, site_products(title_bg)",
      )
      .eq("email", normalized)
      .order("purchased_at", { ascending: false })
      .limit(20),
    supabase
      .from("form_submissions")
      .select("submitted_at, answers, form_templates(name, fields)")
      .eq("email", normalized)
      .order("submitted_at", { ascending: false })
      .limit(15),
    contact.contactId
      ? supabase
          .from("contact_events")
          .select("*")
          .eq("contact_id", contact.contactId)
          .in("event_type", ["zoom_joined", "zoom_left"])
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as ContactEvent[] }),
  ]);

  const purchases: PersonPurchase[] = [];
  for (const row of (purchaseRows as {
    purchased_at: string;
    product_id: string | null;
    stripe_product_id: string | null;
    payment_status: PersonPurchase["paymentStatus"];
    amount_cents: number | null;
    currency: string | null;
    site_products: { title_bg: string } | { title_bg: string }[] | null;
  }[] | null) ?? []) {
    const product = Array.isArray(row.site_products)
      ? row.site_products[0]
      : row.site_products;
    purchases.push({
      productTitle: product?.title_bg?.trim() || row.stripe_product_id || "Продукт",
      productId: row.product_id,
      stripeProductId: row.stripe_product_id,
      paymentStatus: row.payment_status ?? "paid",
      amountCents: row.amount_cents,
      currency: row.currency,
      purchasedAt: row.purchased_at,
    });
  }

  const formSubmissions: PersonFormSubmission[] = [];
  for (const row of (submissionRows as {
    submitted_at: string;
    answers: Record<string, string | string[] | boolean>;
    form_templates: { name: string; fields: FormField[] } | { name: string; fields: FormField[] }[] | null;
  }[] | null) ?? []) {
    const form = Array.isArray(row.form_templates)
      ? row.form_templates[0]
      : row.form_templates;
    const fields = Array.isArray(form?.fields) ? form.fields : [];
    formSubmissions.push({
      formName: form?.name ?? "Форма",
      submittedAt: row.submitted_at,
      rows: formatSubmissionAnswers(fields, row.answers ?? {}),
    });
  }

  const zoomSessions = zoomSessionsFromEvents(
    ((eventRows as ContactEvent[] | null) ?? []).filter(
      (e) => e.event_type === "zoom_left",
    ),
  );

  return { contact, purchases, formSubmissions, zoomSessions };
}
