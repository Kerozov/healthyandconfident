import { getAdminSiteContent } from "@/lib/site/content";
import { WebsiteManager } from "@/components/admin/website-manager";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const content = await getAdminSiteContent();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Website</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Manage homepage sections — upcoming events and Stripe product links.
      </p>

      <div className="mt-8">
        <WebsiteManager
          sections={content.sections}
          events={content.events}
          products={content.products}
          dbReady={content.dbReady}
          dbError={content.dbError}
        />
      </div>
    </div>
  );
}
