import { getContacts } from "@/lib/admin/contacts-data";
import { ContactsManager } from "@/components/admin/contacts-manager";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await getContacts();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Контакти</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Journey timeline — плащане, reminders, Zoom и кликове от имейли.
      </p>
      <div className="mt-8">
        <ContactsManager contacts={contacts} />
      </div>
    </div>
  );
}
