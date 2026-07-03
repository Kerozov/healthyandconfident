import { getEngagementOverview } from "@/lib/admin/engagement";
import { EngagementDashboard } from "@/components/admin/engagement-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminEngagementPage() {
  const overview = await getEngagementOverview();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Статистика имейли</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Отваряния (от пощенския сървър) и кликове на бутони (проследявани при
        натискане). За всеки абонат — в таб Subscribers.
      </p>
      <div className="mt-8">
        <EngagementDashboard overview={overview} />
      </div>
    </div>
  );
}
