import { getPopups, getSegments } from "@/lib/admin/data";
import { PopupEditor } from "@/components/admin/popup-editor";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminPopupPage() {
  const [popups, segments] = await Promise.all([getPopups(), getSegments()]);

  return (
    <div>
      <PageHeader
        title="Popup и thank you екрани"
        description="Popup формата и бутоните след записване или покупка на всеки език."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {popups.map((p) => (
          <PopupEditor key={p.id} popup={p} segments={segments} />
        ))}
      </div>
    </div>
  );
}
