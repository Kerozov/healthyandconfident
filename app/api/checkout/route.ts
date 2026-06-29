import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createProductCheckoutSession } from "@/lib/stripe/create-checkout";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productIds?: string[];
      locale?: string;
    };

    const productIds = body.productIds?.filter(Boolean) ?? [];
    const locale = body.locale && isLocale(body.locale) ? (body.locale as Locale) : "bg";

    const url = await createProductCheckoutSession(productIds, locale);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ message }, { status: 400 });
  }
}
