import { getAdminSiteBundles, getAdminBlackFridayConfig } from "@/lib/site/bundles";
import { BundlesManager } from "@/components/admin/bundles-manager";
import { PageHeader } from "@/components/admin/ui";
import { publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminBundlesPage() {
  const [bundles, config] = await Promise.all([
    getAdminSiteBundles(),
    getAdminBlackFridayConfig(),
  ]);

  return (
    <div>
      <PageHeader
        title="Пакети за Черния петък"
        description="Създавай пакетите за Черния петък тук - заглавие, какво включва, стара и нова цена, бонус и Stripe Payment Link. Готовите пакети излизат веднага на страницата /black-friday и в лентата най-горе на сайта."
      />
      <BundlesManager bundles={bundles} config={config} siteOrigin={publicSiteOrigin()} />
    </div>
  );
}
