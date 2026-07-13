import { getZoomOverview } from "@/lib/admin/zoom-stats";
import { getZoomLiveConfig } from "@/lib/zoom/live";
import { ZoomDashboard } from "@/components/admin/zoom-dashboard";
import { ZoomLiveSettings } from "@/components/admin/zoom-live-settings";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminZoomPage() {
  const [overview, liveConfig] = await Promise.all([
    getZoomOverview(),
    getZoomLiveConfig(),
  ]);

  return (
    <div>
      <PageHeader
        title="Zoom срещи"
        description="Проведени срещи, кой колко е бил и общо време."
      />
      <div className="space-y-8">
        <ZoomLiveSettings config={liveConfig} />
        <ZoomDashboard overview={overview} />
      </div>
    </div>
  );
}
