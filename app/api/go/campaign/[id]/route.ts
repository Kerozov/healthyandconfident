import { NextResponse } from "next/server";
import { resolveCtaTarget, isSafeCtaTarget } from "@/lib/email/cta-redirect";
import { verifyClickToken } from "@/lib/email/click-token";
import { recordEmailLinkClick } from "@/lib/email/track-click";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("email_campaigns")
    .select("cta_url")
    .eq("id", id)
    .maybeSingle();

  const target = (data as { cta_url?: string } | null)?.cta_url?.trim() ?? "";
  if (!target || !isSafeCtaTarget(target)) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const resolved = resolveCtaTarget(target);
  const tokenRaw = url.searchParams.get("t");
  if (tokenRaw) {
    const payload = verifyClickToken(tokenRaw);
    if (payload && payload.s === "campaign" && payload.i === id) {
      try {
        await recordEmailLinkClick({
          sourceType: "campaign",
          sourceId: id,
          email: payload.e,
          subscriberId: payload.sid,
          targetUrl: resolved,
        });
      } catch {
        /* still redirect */
      }
    }
  }

  return NextResponse.redirect(resolved, 302);
}
