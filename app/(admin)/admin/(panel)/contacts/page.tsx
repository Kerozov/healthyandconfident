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
        description="Journey на клиента — плащане, Zoom време по сесии, reminders и кликове. Кликни имейл за детайли."
      />
      <ContactsManager contacts={contacts} />
    </div>
  );
}
