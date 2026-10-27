import { Suspense } from "react";
import { getZoomReport } from "@/lib/admin/zoom-stats";
import { zoomReportForDays } from "@/lib/admin/zoom-report";
import { parseStatsPeriod } from "@/lib/admin/stats-periods";
import { getZoomLiveConfig } from "@/lib/zoom/live";
import { PageHeaderActions } from "@/components/admin/page-header-actions";
import { StatsToolbar } from "@/components/admin/stats-toolbar";
import { ZoomDashboard } from "@/components/admin/zoom-dashboard";
import { ZoomLiveSettings } from "@/components/admin/zoom-live-settings";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
// Aggregates a large table — the platform default (seconds) cuts the report off.
export const maxDuration = 60;

export default async function AdminZoomPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  // Срещите са седмични — 90 дни показват достатъчно сесии, за да се види кой се връща.
  const period = periodParam ? parseStatsPeriod(periodParam) : 90;
  const [report, liveConfig] = await Promise.all([
    getZoomReport(),
    getZoomLiveConfig(),
  ]);

  return (
    <div>
      <PageHeader
        title="Zoom срещи"
        description="Всяка проведена сесия поотделно, кой колко е стоял и кой се връща. Хората без имейл също се броят - по името им в Zoom."
        actions={<PageHeaderActions />}
      >
        <Suspense fallback={null}>
          <StatsToolbar active={period} />
        </Suspense>
      </PageHeader>
      <div className="space-y-8">
        <ZoomDashboard report={zoomReportForDays(report, period)} />
        <ZoomLiveSettings config={liveConfig} />
      </div>
    </div>
  );
}
