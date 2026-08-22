import { getEmailFooters, getSiteProducts } from "@/lib/admin/data";
import { getFormTemplates } from "@/lib/admin/forms-data";
import { footerConfigFromRow } from "@/lib/email/footer-defaults";
import { EmailFooterEditor } from "@/components/admin/email-footer-editor";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminEmailFooterPage() {
  const [rows, products, forms] = await Promise.all([
    getEmailFooters(),
    getSiteProducts(true),
    getFormTemplates(),
  ]);
  const bg = footerConfigFromRow(
    rows.find((r) => r.locale === "bg") ?? null,
    "bg",
  );
  const en = footerConfigFromRow(
    rows.find((r) => r.locale === "en") ?? null,
    "en",
  );

  return (
    <div>
      <PageHeader
        title="Email подпис"
        description="Горен header, личен подпис с линкове или бутони, и фирмен footer във всички имейли. Линкът за отписване се добавя автоматично."
      />

      <div className="grid gap-10 xl:grid-cols-2">
        <EmailFooterEditor config={bg} products={products} forms={forms} />
        <EmailFooterEditor config={en} products={products} forms={forms} />
      </div>
    </div>
  );
}
