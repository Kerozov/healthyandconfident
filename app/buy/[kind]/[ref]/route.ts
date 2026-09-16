import { NextResponse, type NextRequest } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { publicSiteOrigin } from "@/lib/site";
import { getSiteGuides, getSiteProducts } from "@/lib/site/content";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import {
  catalogMatchesRef,
  catalogPagePath,
  isCatalogKind,
  safeDecodeRef,
  type CatalogKind,
} from "@/lib/site/share-links";
import { guideSellableInLocale, guideStripeForLocale } from "@/lib/site/guide-catalog";
import {
  productSellableInLocale,
  productStripeForLocale,
} from "@/lib/site/product-locale";
import {
  createGuideCheckoutSession,
  createProductCheckoutSession,
} from "@/lib/stripe/create-checkout";

export const dynamic = "force-dynamic";

/**
 * The short link an admin copies out of the panel and pastes into a bio, a DM
 * or an ad: `/buy/guide/6-retsepti`.
 *
 * It is a route of ours rather than the Stripe Payment Link itself, so the
 * checkout still carries the contact behind the click, and so the link keeps
 * working when the Stripe product behind it is swapped. Anything that cannot
 * be paid for right now lands on the row's page instead of on an error.
 */

function localeFrom(request: NextRequest): Locale {
  const raw =
    request.nextUrl.searchParams.get("l") ??
    request.nextUrl.searchParams.get("locale");
  return raw && isLocale(raw) ? raw : "bg";
}

/**
 * Reads through the same loader the pages use, so a link that resolves here
 * resolves there too — and so a database that is briefly unreachable lands the
 * visitor on the site rather than on a 500 page.
 */
async function findRow(
  kind: CatalogKind,
  ref: string,
): Promise<SiteGuide | SiteProduct | null> {
  const rows: (SiteGuide | SiteProduct)[] =
    kind === "guide" ? await getSiteGuides(true) : await getSiteProducts(true);
  const wanted = ref.toLowerCase();
  // Slug wins over id: a slug someone typed by hand is never a uuid, so a row
  // whose slug matches is the one that link was written for.
  return (
    rows.find((row) => (row.slug?.trim().toLowerCase() ?? "") === wanted) ??
    rows.find((row) => catalogMatchesRef(row, ref)) ??
    null
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ kind: string; ref: string }> },
) {
  const { kind: rawKind, ref: rawRef } = await context.params;
  const locale = localeFrom(request);
  const origin = publicSiteOrigin();
  const home = `${origin}/${locale}`;

  if (!isCatalogKind(rawKind)) {
    return NextResponse.redirect(home, 302);
  }
  const kind = rawKind;
  const ref = safeDecodeRef(rawRef ?? "");
  if (!ref) return NextResponse.redirect(home, 302);

  let row: SiteGuide | SiteProduct | null = null;
  try {
    row = await findRow(kind, ref);
  } catch (err) {
    console.warn("[buy] lookup failed:", kind, ref, err);
  }
  if (!row) return NextResponse.redirect(home, 302);

  const page = `${origin}${catalogPagePath(kind, row, locale)}`;

  const sellable =
    kind === "guide"
      ? guideSellableInLocale(row as SiteGuide, locale)
      : productSellableInLocale(row as SiteProduct, locale);
  if (!sellable) return NextResponse.redirect(page, 302);

  const stripe =
    kind === "guide"
      ? guideStripeForLocale(row as SiteGuide, locale)
      : productStripeForLocale(row as SiteProduct, locale);

  // Our own Checkout session is the only route that carries the contact id into
  // Stripe, so it wins whenever the row has a price. A Payment Link is the
  // fallback for rows configured with nothing else.
  if (!stripe.stripe_price_id) {
    return NextResponse.redirect(stripe.stripe_url || page, 302);
  }

  const contactId = request.cookies.get("hc_contact")?.value?.trim();

  try {
    const session =
      kind === "guide"
        ? await createGuideCheckoutSession([row.id], locale, contactId || undefined)
        : await createProductCheckoutSession([row.id], locale, contactId || undefined);
    return NextResponse.redirect(session.url, 302);
  } catch (err) {
    console.warn(
      "[buy] checkout failed:",
      kind,
      row.id,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.redirect(page, 302);
  }
}
