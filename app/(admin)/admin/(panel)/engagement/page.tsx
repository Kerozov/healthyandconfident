import { Suspense } from "react";
import { getAdminSession, sessionCanAccess } from "@/lib/admin/auth";
import { getEmailStats } from "@/lib/admin/email-stats";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";
import { EmailStatsDashboard } from "@/components/admin/email-stats-dashboard";
import { StatsToolbar } from "@/components/admin/stats-toolbar";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
// Aggregates a large table — the platform default (seconds) cuts the report off.
export const maxDuration = 60;

export default async function AdminEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseStatsPeriod(periodParam);
  const [stats, session] = await Promise.all([
    getEmailStats(period),
    getAdminSession(),
  ]);
  // Opening a row loads that automation's recipients, which is the automations
  // screen's data — don't offer it to someone who can't open that screen.
  const canOpenAutomations = session
    ? sessionCanAccess(session, "automations")
    : false;

  return (
    <div>
      <PageHeader
        title="Статистика — имейли"
        description="Доставки, отваряния, кликове и ангажираност. За профил на конкретен човек — Абонати → иконата за статистика."
      >
        <Suspense fallback={null}>
          <StatsToolbar active={period} />
        </Suspense>
      </PageHeader>
      <EmailStatsDashboard
        stats={stats}
        canOpenAutomations={canOpenAutomations}
      />
    </div>
  );
}
