import { getContacts } from "@/lib/admin/contacts-data";
import { getContactIdsForMeeting, getZoomMeetingOptions } from "@/lib/admin/zoom-stats";
import { ContactsManager } from "@/components/admin/contacts-manager";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const { meeting } = await searchParams;
  const meetingId = meeting?.trim() || "";

  const [allContacts, meetingOptions, meetingContactIds] = await Promise.all([
    getContacts(),
    getZoomMeetingOptions(),
    meetingId ? getContactIdsForMeeting(meetingId) : Promise.resolve([]),
  ]);

  const meetingSet = new Set(meetingContactIds);
  const contacts =
    meetingId && meetingSet.size > 0
      ? allContacts.filter((c) => meetingSet.has(c.id))
      : meetingId
        ? []
        : allContacts;

  return (
    <div>
      <PageHeader
        title="Контакти"
        description="Journey на клиента — плащане, Zoom време по сесии, reminders и кликове. Кликни имейл за детайли."
      />
      <ContactsManager
        contacts={contacts}
        meetingOptions={meetingOptions}
        activeMeetingId={meetingId || null}
      />
    </div>
  );
}
