import { getContacts } from "@/lib/admin/contacts-data";
import { ContactsManager } from "@/components/admin/contacts-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage() {
  const contacts = await getContacts();

  return (
    <div>
      <PageHeader
        title="Контакти"
        description="Път на клиента — плащане, reminders, Zoom и кликове от имейли."
      />
      <ContactsManager contacts={contacts} />
    </div>
  );
}
