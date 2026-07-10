import {
  getEmailCampaigns,
  getSmsCampaigns,
  getSegments,
  getSegmentGroups,
  getSiteProducts,
  getSubscriberTags,
} from "@/lib/admin/data";
import { getFormTemplates } from "@/lib/admin/forms-data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { CampaignsWorkspace } from "@/components/admin/campaigns-workspace";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const [emailCampaigns, smsCampaigns, segments, groups, products, forms, subscriberTags] =
    await Promise.all([
      getEmailCampaigns(),
      getSmsCampaigns(),
      getSegments(),
      getSegmentGroups(),
      getSiteProducts(true),
      getFormTemplates(),
      getSubscriberTags(),
    ]);
  const workerConfigured = isNotificationWorkerConfigured();

  return (
    <div>
      <PageHeader
        title="Кампании"
        description="Изпращане по сегмент или тагове, проследяване на доставката и повторно изпращане към неотворили."
      />

      <CampaignsWorkspace
          emailCampaigns={emailCampaigns}
          smsCampaigns={smsCampaigns}
          segments={segments}
          groups={groups}
          products={products}
          forms={forms}
          subscriberTags={subscriberTags}
          workerConfigured={workerConfigured}
        />
    </div>
  );
}
