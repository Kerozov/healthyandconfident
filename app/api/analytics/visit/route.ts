import { NextResponse } from "next/server";
import { isBotUserAgent } from "@/lib/analytics/classify";
import { recordSiteVisit } from "@/lib/analytics/record";
import { createRateLimiter, requestIp } from "@/lib/util/rate-limit";

export const dynamic = "force-dynamic";

const rateLimited = createRateLimiter(80, 60_000);

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent");
  if (isBotUserAgent(ua)) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  if (rateLimited(requestIp(req))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await recordSiteVisit(body, ua);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
