import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/email/cta-redirect";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { unsubscribeEmail } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "bg";
  const origin = siteOrigin();

  if (!token) {
    return NextResponse.redirect(`${origin}/${locale}/unsubscribe?status=invalid`);
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return NextResponse.redirect(`${origin}/${locale}/unsubscribe?status=invalid`);
  }

  const result = await unsubscribeEmail(parsed.email);
  const status = result.ok
    ? result.status === "already"
      ? "already"
      : "success"
    : result.reason === "not_found"
      ? "not_found"
      : "invalid";

  return NextResponse.redirect(`${origin}/${locale}/unsubscribe?status=${status}`);
}
