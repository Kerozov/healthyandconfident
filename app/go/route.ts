import { NextResponse } from "next/server";
import { resolveCtaTarget } from "@/lib/email/cta-redirect";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactById } from "@/lib/contacts/ensure";
import { publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

const DEFAULT_TARGET = "/bg#programs";

/**
 * `to` arrives straight from the query string, so only our own paths are
 * allowed. Accepting absolute URLs here turned the tracking link into an open
 * redirect that could carry the site's own domain into a phishing hop.
 * Every link we build (see `buildContactGoUrl`) is already site-relative.
 */
function safeInternalTarget(to: string | undefined): string {
  if (!to) return DEFAULT_TARGET;
  // Reject protocol-relative (`//evil.com`) and backslash variants browsers normalise.
  if (!to.startsWith("/") || to.startsWith("//") || to.startsWith("/\\")) {
    return DEFAULT_TARGET;
  }
  return to;
}

/** Tracked redirect from email buttons: /go?contact=…&src=email&campaign=…&job=…&to=… */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const contactId = url.searchParams.get("contact")?.trim();
  const src = url.searchParams.get("src")?.trim() || "email";
  const campaignId = url.searchParams.get("campaign")?.trim() || null;
  const workerJobId = url.searchParams.get("job")?.trim() || null;
  const to = url.searchParams.get("to")?.trim();

  if (contactId) {
    const contact = await getContactById(contactId);
    if (contact) {
      try {
        await recordContactEvent({
          contactId,
          eventType: "link_click",
          source: src,
          campaignId,
          workerJobId,
          metadata: { target: to ?? null },
        });
      } catch {
        /* still redirect */
      }
    }
  }

  const resolved = resolveCtaTarget(safeInternalTarget(to));
  const destination = resolved || `${publicSiteOrigin()}${DEFAULT_TARGET}`;
  const response = NextResponse.redirect(destination, 302);

  // Checkout reads this cookie so a later Stripe session still belongs to the person
  // who clicked the email — `/go` itself does not put `contact` on the landing URL.
  if (contactId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactId)) {
    response.cookies.set("hc_contact", contactId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      httpOnly: true,
    });
  }

  return response;
}
