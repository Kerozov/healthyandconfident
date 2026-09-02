import { Suspense } from "react";
import { getEmailStats } from "@/lib/admin/email-stats";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";
import { EmailStatsDashboard } from "@/components/admin/email-stats-dashboard";
import { StatsToolbar } from "@/components/admin/stats-toolbar";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseStatsPeriod(periodParam);
  const stats = await getEmailStats(period);

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
      <EmailStatsDashboard stats={stats} />
    </div>
  );
}
