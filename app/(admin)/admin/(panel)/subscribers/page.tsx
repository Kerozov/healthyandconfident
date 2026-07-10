import { getSubscribers, getSegments, getSegmentGroups, getSubscriberTags } from "@/lib/admin/data";
import { getEngagementSummaryForEmails } from "@/lib/admin/engagement";
import { getContactSummariesForEmails } from "@/lib/admin/person-profile";
import { SubscribersManager } from "@/components/admin/subscribers-manager";
import { SegmentsManager } from "@/components/admin/segments-manager";
import { GroupsManager } from "@/components/admin/groups-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const [subscribers, segments, groups, subscriberTags] = await Promise.all([
    getSubscribers(),
    getSegments(),
    getSegmentGroups(),
    getSubscriberTags(),
  ]);

  const [engagementByEmail, contactByEmail] = await Promise.all([
    getEngagementSummaryForEmails(subscribers.map((s) => s.email)).then((map) =>
      Object.fromEntries(map),
    ),
    getContactSummariesForEmails(subscribers.map((s) => s.email)).then((map) =>
      Object.fromEntries(map),
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Абонати"
        description="Управление на списъка — сегменти, имейл активност, Zoom и покупки. Кликни иконата за статистика до имейла за пълен профил."
      />
      <div className="space-y-8">
        <GroupsManager groups={groups} />
        <SegmentsManager segments={segments} groups={groups} />
        <SubscribersManager
          subscribers={subscribers}
          segments={segments}
          groups={groups}
          subscriberTags={subscriberTags}
          engagementByEmail={engagementByEmail}
          contactByEmail={contactByEmail}
        />
      </div>
    </div>
  );
}
