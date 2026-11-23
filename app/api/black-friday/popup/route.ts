import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getBlackFridayConfig } from "@/lib/black-friday/config";
import { getBlackFridayBundleOffers } from "@/lib/black-friday/offers";
import { blackFridayPhase } from "@/lib/site/black-friday-phase";
import { formatCents } from "@/lib/site/price-format";
import type { BlackFridayPopupData, BlackFridayPopupDeal } from "@/lib/black-friday/popup-types";

export const dynamic = "force-dynamic";

const OFF: BlackFridayPopupData = { live: false, deadline: null, deals: [] };

/**
 * What the site-wide Black Friday popup shows. Asked by the browser, so the
 * popup follows the admin settings even on pages cached before a change.
 */
export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") || "bg";
  if (!isLocale(locale)) return NextResponse.json(OFF, { status: 400 });

  const config = await getBlackFridayConfig();
  if (!config || blackFridayPhase(config) !== "live") return NextResponse.json(OFF);

  let deals: BlackFridayPopupDeal[] = [];
  try {
    const bundles = await getBlackFridayBundleOffers(locale);
    deals = bundles.slice(0, 3).map((b) => ({
      title: b.title,
      price: formatCents(b.finalCents, "eur", locale),
      was: formatCents(b.regularCents, "eur", locale),
      savedPercent: b.savedPercent,
    }));
  } catch (err) {
    // Without the bundles the popup still invites to the offers page.
    console.error("[black-friday] popup deals:", err instanceof Error ? err.message : err);
  }

  const body: BlackFridayPopupData = { live: true, deadline: config.deadline, deals };
  return NextResponse.json(body, {
    // Same answer for everyone: the CDN keeps it a minute, the browser always asks again
    // (a browser-side stale-while-revalidate would show yesterday's answer first).
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "CDN-Cache-Control": "max-age=60, stale-while-revalidate=300",
    },
  });
}
