import { getPopups, getSegments } from "@/lib/admin/data";
import { PopupEditor } from "@/components/admin/popup-editor";

export const dynamic = "force-dynamic";

export default async function AdminPopupPage() {
  const [popups, segments] = await Promise.all([getPopups(), getSegments()]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Popup</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Edit the message and email-capture popup for each language.
      </p>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {popups.map((p) => (
          <PopupEditor key={p.id} popup={p} segments={segments} />
        ))}
      </div>
    </div>
  );
}
