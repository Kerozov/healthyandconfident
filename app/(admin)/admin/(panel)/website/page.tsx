import { getAdminSiteContent } from "@/lib/site/content";
import { getSegmentGroups, getSegments } from "@/lib/admin/data";
import { WebsiteManager } from "@/components/admin/website-manager";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const [content, segments, groups] = await Promise.all([
    getAdminSiteContent(),
    getSegments(),
    getSegmentGroups(),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Website</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Продукти в магазина, събития, YouTube видеа и popup upsell при клик на бутон/продукт.
      </p>

      <div className="mt-8">
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
    </div>
  );
}
