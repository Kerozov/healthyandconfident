import { NextResponse } from "next/server";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { syncNightlyWorkerStats } from "@/lib/worker/sync-stats";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/worker-stats] CRON_SECRET is not configured");
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isNotificationWorkerConfigured()) {
    console.error("[cron/worker-stats] Notification worker is not configured");
    return NextResponse.json({ error: "Notification worker is not configured" }, { status: 503 });
  }

  const result = await syncNightlyWorkerStats();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
