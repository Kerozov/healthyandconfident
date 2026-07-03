import { getSubscribers, getSegments, getSegmentGroups, getSubscriberTags } from "@/lib/admin/data";
import { getEngagementSummaryForEmails } from "@/lib/admin/engagement";
import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { SegmentsManager } from "@/components/admin/segments-manager";
import { GroupsManager } from "@/components/admin/groups-manager";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const [subscribers, segments, groups, subscriberTags] = await Promise.all([
    getSubscribers(),
    getSegments(),
    getSegmentGroups(),
    getSubscriberTags(),
  ]);

  const engagementByEmail = Object.fromEntries(
    (
      await getEngagementSummaryForEmails(subscribers.map((s) => s.email))
    ).entries(),
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Subscribers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Full control of your list — add manually, segment, export and manage status.
      </p>
      <div className="mt-8 space-y-8">
        <GroupsManager groups={groups} />
        <SegmentsManager segments={segments} groups={groups} />
        <SubscribersManager
          subscribers={subscribers}
          segments={segments}
          groups={groups}
          subscriberTags={subscriberTags}
          engagementByEmail={engagementByEmail}
        />
      </div>
    </div>
  );
}
