import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createProductCheckoutSession, createGuideCheckoutSession } from "@/lib/stripe/create-checkout";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactById } from "@/lib/contacts/ensure";
import { schedulePrePaymentReminders } from "@/lib/contacts/reminders";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productIds?: string[];
      guideIds?: string[];
      locale?: string;
      contactId?: string;
    };

    const productIds = body.productIds?.filter(Boolean) ?? [];
    const guideIds = body.guideIds?.filter(Boolean) ?? [];
    const locale = body.locale && isLocale(body.locale) ? (body.locale as Locale) : "bg";
    const contactId = body.contactId?.trim();

    if (productIds.length > 0 && guideIds.length > 0) {
      return NextResponse.json(
        { message: "Cannot checkout products and guides together" },
        { status: 400 },
      );
    }

    if (contactId && productIds.length > 0) {
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

    if (productIds.length === 0 && guideIds.length === 0) {
      return NextResponse.json({ message: "No items selected" }, { status: 400 });
    }

    if (guideIds.length > 0) {
      const url = await createGuideCheckoutSession(guideIds, locale, contactId);
      return NextResponse.json({ url });
    }

    const url = await createProductCheckoutSession(productIds, locale, contactId);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
