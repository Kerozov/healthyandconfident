import { Suspense } from "react";
import { getVisitStats } from "@/lib/admin/visit-stats";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";
import { VisitStatsDashboard } from "@/components/admin/visit-stats-dashboard";
import { PeriodFilter } from "@/components/admin/period-filter";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parseStatsPeriod(periodParam);
  const stats = await getVisitStats(period);

  return (
    <div>
      <PageHeader
        title="Посещения"
        description="Колко човека влизат в сайта, откъде идват, кои страници гледат и колко стигат до записване и плащане."
      >
        <Suspense fallback={null}>
          <PeriodFilter active={period} />
        </Suspense>
      </PageHeader>
      <VisitStatsDashboard stats={stats} />
    </div>
  );
}
