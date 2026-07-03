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
  const locale = url.searchParams.get("locale") === "en" ? "en" : "bg";
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("automations")
    .select("cta_url_bg, cta_url_en")
    .eq("id", id)
    .maybeSingle();

  const row = data as { cta_url_bg?: string; cta_url_en?: string } | null;
  const target =
    (locale === "en" ? row?.cta_url_en : row?.cta_url_bg)?.trim() ?? "";

  if (!target || !isSafeCtaTarget(target)) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const resolved = resolveCtaTarget(target);
  const tokenRaw = url.searchParams.get("t");
  if (tokenRaw) {
    const payload = verifyClickToken(tokenRaw);
    if (payload && payload.s === "automation" && payload.i === id) {
      try {
        await recordEmailLinkClick({
          sourceType: "automation",
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
