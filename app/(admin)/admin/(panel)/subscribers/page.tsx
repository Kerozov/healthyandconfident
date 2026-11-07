import { getSubscribers, getSegments, getSegmentGroups } from "@/lib/admin/data";
import { countAudience } from "@/lib/segments/hierarchy";
import { getAdminSession } from "@/lib/admin/auth";
import { getContactStatuses } from "@/lib/admin/contact-statuses";
import { getFormNamesBySlug } from "@/lib/admin/forms-data";
import { SubscribersTable } from "@/components/admin/subscribers-table";
import { SubscriberAddImport } from "@/components/admin/subscriber-add-import";
import { SegmentsManager } from "@/components/admin/segments-manager";
import { GroupsManager } from "@/components/admin/groups-manager";
import { FunnelBrandSync } from "@/components/admin/funnel-brand-sync";
import { ContactStatusesManager } from "@/components/admin/contact-statuses-manager";
import { getFunnelBrandSyncStatus } from "@/lib/integrations/funnel-brand-sync";
import { PageHeader } from "@/components/admin/ui";
import {
  SUBSCRIBER_TABS,
  SubscribersTabs,
  type SubscriberTab,
} from "@/components/admin/subscribers-tabs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Search = {
  tab?: string;
  q?: string;
  group?: string;
  status?: string;
  source?: string;
  sub?: string;
  sort?: string;
  dir?: string;
  page?: string;
  size?: string;
};

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = await searchParams;
  const [subscribers, segments, groups, funnelBrandStatus, statusData, formNames, session] =
    await Promise.all([
      getSubscribers(),
      getSegments(),
      getSegmentGroups(),
      getFunnelBrandSyncStatus(),
      getContactStatuses(),
      getFormNamesBySlug(),
      getAdminSession(),
    ]);

  const audienceCounts = countAudience(subscribers, groups, segments);

  const subscriberTags = [
    ...new Set(subscribers.flatMap((s) => s.tags ?? []).filter((t) => t && t !== "all")),
  ].sort();

  const countByStatusId: Record<string, number> = {};
  for (const s of subscribers) {
    if (s.crm_status_id) countByStatusId[s.crm_status_id] = (countByStatusId[s.crm_status_id] ?? 0) + 1;
  }

  const initialTab: SubscriberTab = (SUBSCRIBER_TABS as readonly string[]).includes(query.tab ?? "")
    ? (query.tab as SubscriberTab)
    : "contacts";

  return (
    <div>
      <PageHeader
        title="Абонати"
        description="Всички хора в списъка. Кликни на човек за пълен профил - групи, имейли, Zoom, покупки, статуси и история."
      />
      <SubscribersTabs
        initialTab={initialTab}
        isOwner={session?.role === "owner"}
        contactCount={subscribers.length}
        contacts={
          <SubscribersTable
            subscribers={subscribers}
            segments={segments}
            groups={groups}
            statuses={statusData.statuses}
            statusesAvailable={statusData.available}
            subscriberTags={subscriberTags}
            formNames={formNames}
            initialQuery={query}
          />
        }
        groups={
          <div className="space-y-8">
            <SegmentsManager
              segments={segments}
              groups={groups}
              countBySegmentKey={audienceCounts.bySegmentKey}
            />
            <GroupsManager groups={groups} countByGroupId={audienceCounts.byGroupId} />
          </div>
        }
        sync={<FunnelBrandSync status={funnelBrandStatus} segments={segments} groups={groups} />}
        add={
          <SubscriberAddImport
            segments={segments}
            groups={groups}
            subscriberTags={subscriberTags}
          />
        }
        statuses={
          <ContactStatusesManager
            statuses={statusData.statuses}
            available={statusData.available}
            countByStatusId={countByStatusId}
          />
        }
      />
    </div>
  );
}
