import { getEmailFooters } from "@/lib/admin/data";
import { footerConfigFromRow } from "@/lib/email/footer-defaults";
import { EmailFooterEditor } from "@/components/admin/email-footer-editor";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminEmailFooterPage() {
  const rows = await getEmailFooters();
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
        description="Личен подпис и фирмен footer във всички имейли. Линкът за отписване се добавя автоматично."
      />

      <div className="grid gap-10 xl:grid-cols-2">
        <EmailFooterEditor config={bg} />
        <EmailFooterEditor config={en} />
      </div>
    </div>
  );
}
