import { getEngagementOverview } from "@/lib/admin/engagement";
import { EngagementDashboard } from "@/components/admin/engagement-dashboard";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage() {
  const overview = await getEngagementOverview();

  return (
    <div>
      <PageHeader
        title="Статистика"
        description="Отваряния и кликове на бутони. За всеки абонат — в секция Абонати."
      />
      <EngagementDashboard overview={overview} />
    </div>
  );
}
