import { getEmailFooters } from "@/lib/admin/data";
import { footerConfigFromRow } from "@/lib/email/footer-defaults";
import { EmailFooterEditor } from "@/components/admin/email-footer-editor";

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
      <h1 className="font-display text-3xl font-semibold">Email footer</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Личен подпис и фирмен footer в долната част на всички имейли (кампании,
        автоматизации, форми). Линкът за отписване се добавя автоматично.
      </p>

      <div className="mt-8 grid gap-10 xl:grid-cols-2">
        <EmailFooterEditor config={bg} />
        <EmailFooterEditor config={en} />
      </div>
    </div>
  );
}
