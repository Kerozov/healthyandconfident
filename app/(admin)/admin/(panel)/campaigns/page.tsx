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
      <h1 className="font-display text-3xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Send by segment or tags, track delivery live from the worker, and resend
        to non-openers.
      </p>

      <div className="mt-8">
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
    </div>
  );
}
