import { NextResponse } from "next/server";
import { resolveCtaTarget, isSafeCtaTarget } from "@/lib/email/cta-redirect";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  return NextResponse.redirect(resolveCtaTarget(target), 302);
}
