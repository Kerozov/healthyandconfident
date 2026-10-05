import { NextResponse } from "next/server";
import { catchUpAutomationChains } from "@/lib/automation/catch-up";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily Vercel cron (vercel.json): queues sequence steps that were missed and
 * retries failed first emails — see catchUpAutomationChains. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Otherwise every run is a silent 401 and missed steps never catch up.
    console.error("[cron/automations] CRON_SECRET is not set — the daily catch-up cannot run");
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await catchUpAutomationChains({ timeBudgetMs: 50_000 });
  return NextResponse.json({ ok: true, ...report });
}
