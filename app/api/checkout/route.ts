import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createProductCheckoutSession } from "@/lib/stripe/create-checkout";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactById } from "@/lib/contacts/ensure";
import { schedulePrePaymentReminders } from "@/lib/contacts/reminders";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productIds?: string[];
      locale?: string;
      contactId?: string;
    };

    const productIds = body.productIds?.filter(Boolean) ?? [];
    const locale = body.locale && isLocale(body.locale) ? (body.locale as Locale) : "bg";
    const contactId = body.contactId?.trim();

    if (contactId) {
      const contact = await getContactById(contactId);
      if (contact) {
        void recordContactEvent({
          contactId,
          eventType: "checkout_started",
          source: "site",
          metadata: { product_ids: productIds, locale },
        }).catch(() => {});
        if (contact.payment_status !== "paid") {
          void schedulePrePaymentReminders(contact, locale).catch(() => {});
        }
      }
    }

    const url = await createProductCheckoutSession(productIds, locale, contactId);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
