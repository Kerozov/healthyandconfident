import { getAdminSiteContent } from "@/lib/site/content";
import { getAdminSiteContactConfig } from "@/lib/site/contact-config";
import { getSegmentGroups, getSegments } from "@/lib/admin/data";
import { WebsiteManager } from "@/components/admin/website-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const [content, contactConfig, segments, groups] = await Promise.all([
    getAdminSiteContent(),
    getAdminSiteContactConfig(),
    getSegments(),
    getSegmentGroups(),
  ]);

  return (
    <div>
      <PageHeader
        title="Уебсайт"
        description="Продукти, ръководства, събития, видеа. Тук се задават и офертите (upsell / downsell), които важат навсякъде — в магазина и в имейлите."
      />

      <WebsiteManager
          sections={content.sections}
          events={content.events}
          products={content.products}
          guides={content.guides}
          videos={content.videos}
          ctaPlacements={Object.values(content.ctaPlacements)}
          contactConfig={contactConfig}
          segments={segments}
          groups={groups}
          dbReady={content.dbReady}
          dbError={content.dbError}
        />
    </div>
  );
}
