import { getZoomOverview } from "@/lib/admin/zoom-stats";
import { ZoomDashboard } from "@/components/admin/zoom-dashboard";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminZoomPage() {
  const overview = await getZoomOverview();

  return (
    <div>
      <PageHeader
        title="Zoom статистика"
        description="Кой колко е стоял, в коя среща, топ участници и сравнение между мийтинги."
      />
      <ZoomDashboard overview={overview} />
    </div>
  );
}
