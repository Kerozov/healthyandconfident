import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { createStripeCatalogCheckoutSession } from "@/lib/stripe/create-checkout";
import { isStripeProductId } from "@/lib/stripe/parse-stripe-id";

export const dynamic = "force-dynamic";

/**
 * Email product cards that pick a Stripe catalog product (not a site row)
 * link here. A Checkout Session is created on click so the URL in the email
 * never expires the way a pre-built session would.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await context.params;
  const productId = decodeURIComponent(rawId ?? "").trim();
  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = localeParam && isLocale(localeParam) ? localeParam : "bg";
  const home = `${publicSiteOrigin()}/${locale}?checkout=cancelled`;

  if (!isStripeProductId(productId)) {
    return NextResponse.redirect(home, 302);
  }

  const contactId = request.cookies.get("hc_contact")?.value?.trim();

  try {
    const session = await createStripeCatalogCheckoutSession(
      productId,
      locale,
      contactId || undefined,
    );
    return NextResponse.redirect(session.url, 302);
  } catch (err) {
    console.warn(
      "[go/stripe] checkout failed:",
      productId,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.redirect(home, 302);
  }
}
