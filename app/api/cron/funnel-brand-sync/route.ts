import { NextResponse } from "next/server";
import { syncFunnelBrandContacts } from "@/lib/integrations/funnel-brand-sync";
import { reportLaunchifyEmailUsage } from "@/lib/integrations/launchify-email-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly Vercel cron (vercel.json): pulls the people who signed up in Launchify
 * since the last run, with the groups the admin chose for each webinar - the
 * same as „Синхронизирай“ in the admin. A person who gets a new group loses the
 * scheduled automation emails that exclude it, so someone who already signed up
 * for the webinar stops getting invitations to sign up.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(
      "[cron/funnel-brand-sync] CRON_SECRET is not set - the nightly sync cannot run",
    );
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncFunnelBrandContacts({
    timeBudgetMs: 40_000,
    actor: { id: null, name: "Нощна синхронизация" },
  });

  if (!result.ok) console.error("[cron/funnel-brand-sync]", result.message);

  // What the site sent counts toward the Launchify allowance — one request for all days.
  const usage = await reportLaunchifyEmailUsage({ force: true }).catch(
    () => null,
  );
  if (usage && !usage.ok)
    console.error("[cron/funnel-brand-sync] email usage:", usage.message);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
