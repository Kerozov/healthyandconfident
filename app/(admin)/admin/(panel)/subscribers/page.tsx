import { getSubscribers, getSegments, getSegmentGroups, getSubscriberTags } from "@/lib/admin/data";
import {
  getContactSummariesForEmails,
  type ContactSummary,
} from "@/lib/admin/person-profile";
import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { SegmentsManager } from "@/components/admin/segments-manager";
import { GroupsManager } from "@/components/admin/groups-manager";
import { FunnelBrandSync } from "@/components/admin/funnel-brand-sync";
import { getFunnelBrandSyncStatus } from "@/lib/integrations/funnel-brand-sync";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminSubscribersPage() {
  const [subscribers, segments, groups, subscriberTags, funnelBrandStatus] =
    await Promise.all([
      getSubscribers(),
      getSegments(),
      getSegmentGroups(),
      getSubscriberTags(),
      getFunnelBrandSyncStatus(),
    ]);

  // Contact payment/zoom only — chunked. Bulk engagement for every email
  // times out on large lists (Vercel ERROR page). Per-person stats still load
  // via the 📊 button.
  let contactByEmail: Record<string, ContactSummary> = {};
  try {
    contactByEmail = Object.fromEntries(
      await getContactSummariesForEmails(subscribers.map((s) => s.email)),
    );
  } catch (err) {
    console.error(
      "[admin/subscribers] contact summaries:",
      err instanceof Error ? err.message : err,
    );
  }

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
          contactByEmail={contactByEmail}
        />
      </div>
    </div>
  );
}
