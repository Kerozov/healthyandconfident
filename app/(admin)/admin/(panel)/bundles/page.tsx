import { BlackFridayManager } from "@/components/admin/black-friday-manager";
import { PageHeader } from "@/components/admin/ui";
import { getBlackFridayAdminData } from "@/lib/black-friday/admin";
import { publicSiteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AdminBlackFridayPage() {
  const data = await getBlackFridayAdminData();

  return (
    <div>
      <PageHeader
        title="Черен петък"
        description="Сроковете на кампанията, отстъпки на програми, оферти и ръководства, и комплекти от няколко продукта на една цена. Цените се взимат от Stripe и излизат веднага на /black-friday."
      />
      <BlackFridayManager {...data} siteOrigin={publicSiteOrigin()} />
    </div>
  );
}
