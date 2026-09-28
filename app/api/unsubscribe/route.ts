import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/email/cta-redirect";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { unsubscribeEmail } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

function localeFrom(value: string | null | undefined): "bg" | "en" {
  return value === "en" ? "en" : "bg";
}

function statusPage(locale: "bg" | "en", status: string): string {
  return `${siteOrigin()}/${locale}/unsubscribe?status=${status}`;
}

/**
 * The link in every email. It only opens the confirmation page: mail security
 * scanners (Outlook Safe Links, corporate gateways) fetch every link in an
 * incoming message, so unsubscribing on GET removed people who never clicked.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const locale = localeFrom(url.searchParams.get("locale"));

  if (!token || !verifyUnsubscribeToken(token)) {
    return NextResponse.redirect(statusPage(locale, "invalid"));
  }

  return NextResponse.redirect(
    `${siteOrigin()}/${locale}/unsubscribe?token=${encodeURIComponent(token)}`,
  );
}

/**
 * Performs the unsubscribe. Two callers:
 * - the confirmation page's form (`token` in the body) → redirect to the result;
 * - RFC 8058 one-click from the mailbox provider (`token` in the query, body
 *   `List-Unsubscribe=One-Click`) → a plain 200, nobody is looking.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }

  const token = (
    (form?.get("token") as string | null) ??
    url.searchParams.get("token") ??
    ""
  ).trim();
  const locale = localeFrom(
    (form?.get("locale") as string | null) ?? url.searchParams.get("locale"),
  );
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";

  const parsed = token ? verifyUnsubscribeToken(token) : null;
  if (!parsed) {
    return oneClick
      ? NextResponse.json({ ok: false }, { status: 400 })
      : NextResponse.redirect(statusPage(locale, "invalid"), 303);
  }

  let result: Awaited<ReturnType<typeof unsubscribeEmail>>;
  try {
    result = await unsubscribeEmail(parsed.email);
  } catch (err) {
    console.error("[unsubscribe]", err instanceof Error ? err.message : err);
    return oneClick
      ? NextResponse.json({ ok: false }, { status: 500 })
      : NextResponse.redirect(statusPage(locale, "invalid"), 303);
  }
  if (oneClick) {
    return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 400 });
  }

  const status = result.ok
    ? result.status === "already"
      ? "already"
      : "success"
    : result.reason === "not_found"
      ? "not_found"
      : "invalid";

  return NextResponse.redirect(statusPage(locale, status), 303);
}
