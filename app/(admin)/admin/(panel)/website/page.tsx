import { getAdminSiteContent } from "@/lib/site/content";
import { getSegmentGroups, getSegments } from "@/lib/admin/data";
import { WebsiteManager } from "@/components/admin/website-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const [content, segments, groups] = await Promise.all([
    getAdminSiteContent(),
    getSegments(),
    getSegmentGroups(),
  ]);

  return (
    <div>
      <PageHeader
        title="Уебсайт"
        description="Продукти, ръководства, събития, видеа и popup upsell при клик на бутон."
      />

      <WebsiteManager
          sections={content.sections}
          events={content.events}
          products={content.products}
          guides={content.guides}
          videos={content.videos}
          ctaPlacements={Object.values(content.ctaPlacements)}
          segments={segments}
          groups={groups}
          dbReady={content.dbReady}
          dbError={content.dbError}
        />
    </div>
  );
}
