import { getZoomOverview } from "@/lib/admin/zoom-stats";
import { getZoomLiveConfig } from "@/lib/zoom/live";
import { getRecentZoomWebhookLog } from "@/lib/zoom/sessions";
import { ZoomDashboard } from "@/components/admin/zoom-dashboard";
import { ZoomLiveSettings } from "@/components/admin/zoom-live-settings";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminZoomPage() {
  const [overview, liveConfig, webhookLog] = await Promise.all([
    getZoomOverview(),
    getZoomLiveConfig(),
    getRecentZoomWebhookLog(12),
  ]);

  return (
    <div>
      <PageHeader
        title="Zoom статистика"
        description="Кой колко е стоял, в коя среща, топ участници и сравнение между мийтинги."
      />
      <div className="space-y-8">
        <ZoomLiveSettings config={liveConfig} webhookLog={webhookLog} />
        <ZoomDashboard overview={overview} />
      </div>
    </div>
  );
}
