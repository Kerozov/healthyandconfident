import { getMetaPixelAdminData } from "@/lib/admin/meta-data";
import { MetaPixelManager } from "@/components/admin/meta-pixel-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminMetaPage() {
  const data = await getMetaPixelAdminData();

  return (
    <div>
      <PageHeader
        title="Meta пиксел и реклами"
        description="Проследяване за Facebook и Instagram реклами — от браузъра и от сървъра, с точните суми от Stripe. В „Мета реклами“ по-долу се слагат верификацията на домейна, допълнителните пиксели и данните на рекламния акаунт."
      />
      <MetaPixelManager data={data} />
    </div>
  );
}
