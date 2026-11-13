import { Suspense } from "react";
import { LaunchifyEmailAllowance } from "@/components/admin/launchify-email-allowance";
import {
  getEmailCampaigns,
  getSmsCampaigns,
  getSegments,
  getSegmentGroups,
  getSiteProducts,
  getSiteGuides,
  getSubscriberTags,
} from "@/lib/admin/data";
import { getFormTemplates } from "@/lib/admin/forms-data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { CampaignsWorkspace } from "@/components/admin/campaigns-workspace";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
// Aggregates a large table — the platform default (seconds) cuts the report off.
export const maxDuration = 60;

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ paste?: string }>;
}) {
  const { paste } = await searchParams;
  const [emailCampaigns, smsCampaigns, segments, groups, products, guides, forms, subscriberTags] =
    await Promise.all([
      getEmailCampaigns(),
      getSmsCampaigns(),
      getSegments(),
      getSegmentGroups(),
      getSiteProducts(true),
      getSiteGuides(true),
      getFormTemplates(),
      getSubscriberTags(),
    ]);
  const workerConfigured = isNotificationWorkerConfigured();

  return (
    <div>
      <PageHeader
        title="Кампании"
        description="Изпращане по група или тагове, проследяване на доставката и повторно изпращане към неотворили."
      />

      {/* Launchify се чете отделно — бавен отговор не задържа страницата. */}
      <Suspense fallback={null}>
        <LaunchifyEmailAllowance className="mb-6" />
      </Suspense>

      <CampaignsWorkspace
          emailCampaigns={emailCampaigns}
          smsCampaigns={smsCampaigns}
          segments={segments}
          groups={groups}
          products={products}
          guides={guides}
          forms={forms}
          subscriberTags={subscriberTags}
          workerConfigured={workerConfigured}
          pasteOnOpen={paste === "1"}
        />
    </div>
  );
}
