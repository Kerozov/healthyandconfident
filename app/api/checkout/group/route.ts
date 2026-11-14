import { NextResponse } from "next/server";
import { isLocale, type Locale } from "@/i18n/config";
import { groupLinkForCheckoutSession } from "@/lib/site/program-group";

/**
 * The thank-you screen asks here for the programme's group invite after a
 * Stripe payment. POST keeps the session id out of caches and access logs.
 * The answer is always 200 with `group: null` when there is nothing to show,
 * so a probe learns nothing about which ids exist.
 */
export async function POST(request: Request) {
  let body: { sessionId?: unknown; locale?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Treated as an empty request below.
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const locale: Locale =
    typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "bg";

  const group = sessionId ? await groupLinkForCheckoutSession(sessionId, locale) : null;
  return NextResponse.json(
    { group },
    { headers: { "Cache-Control": "no-store" } },
  );
}
