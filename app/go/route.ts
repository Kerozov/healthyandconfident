import { NextResponse } from "next/server";
import { resolveCtaTarget, isSafeCtaTarget } from "@/lib/email/cta-redirect";
import { recordContactEvent } from "@/lib/contacts/events";
import { getContactById } from "@/lib/contacts/ensure";
import { publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

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

  let target = to || "/bg#programs";
  if (!isSafeCtaTarget(target)) {
    target = "/bg#programs";
  }

  const resolved = resolveCtaTarget(target);
  return NextResponse.redirect(resolved || `${publicSiteOrigin()}/bg#programs`, 302);
}
