import { getAdminSiteContent } from "@/lib/site/content";
import { WebsiteManager } from "@/components/admin/website-manager";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const content = await getAdminSiteContent();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Website</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upsell / Downsell оферти, събития и настройка на бутони.
      </p>

      <div className="mt-8">
        <WebsiteManager
          sections={content.sections}
          events={content.events}
          products={content.products}
          ctaPlacements={Object.values(content.ctaPlacements)}
          segments={content.segments}
          dbReady={content.dbReady}
          dbError={content.dbError}
        />
      </div>
    </div>
  );
}
