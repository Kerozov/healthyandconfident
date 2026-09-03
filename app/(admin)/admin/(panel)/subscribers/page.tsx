import { getSubscribers, getSegments, getSegmentGroups } from "@/lib/admin/data";
import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { SegmentsManager } from "@/components/admin/segments-manager";
import { GroupsManager } from "@/components/admin/groups-manager";
import { FunnelBrandSync } from "@/components/admin/funnel-brand-sync";
import { getFunnelBrandSyncStatus } from "@/lib/integrations/funnel-brand-sync";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminSubscribersPage() {
  const [subscribers, segments, groups, funnelBrandStatus] = await Promise.all([
    getSubscribers(),
    getSegments(),
    getSegmentGroups(),
    getFunnelBrandSyncStatus(),
  ]);

  const subscriberTags = [
    ...new Set(
      subscribers.flatMap((s) => s.tags ?? []).filter((t) => t && t !== "all"),
    ),
  ].sort();

  return (
    <div>
      <PageHeader
        title="Абонати"
        description="Управление на списъка — сегменти, имейли на човека, Zoom и покупки. Кликни иконата 📊 до имейла за пълен профил и история на имейлите."
      />
      <div className="space-y-8">
        <FunnelBrandSync status={funnelBrandStatus} />
        <GroupsManager groups={groups} />
        <SegmentsManager segments={segments} groups={groups} />
        <SubscribersManager
          subscribers={subscribers}
          segments={segments}
          groups={groups}
          subscriberTags={subscriberTags}
          engagementByEmail={{}}
          contactByEmail={{}}
        />
      </div>
    </div>
  );
}
