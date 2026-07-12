import { notFound } from "next/navigation";
import {
  getContactDetail,
  getContactJobEngagement,
} from "@/lib/admin/contacts-data";
import { getPersonEmailHistory } from "@/lib/admin/email-history";
import { ContactDetailView } from "@/components/admin/contact-detail";

export const dynamic = "force-dynamic";

export default async function AdminContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { contact, events, jobs } = await getContactDetail(id);

  if (!contact) notFound();

  const [engagementEntries, emails] = await Promise.all([
    Promise.all(
      jobs.map(async (j) => {
        const eng = await getContactJobEngagement(j.worker_job_id);
        return [j.worker_job_id, eng] as const;
      }),
    ),
    getPersonEmailHistory(contact.email),
  ]);

  const jobEngagement = Object.fromEntries(engagementEntries);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{contact.email}</h1>
      <p className="mt-1 text-sm text-ink-soft">Contact journey</p>
      <div className="mt-8">
        <ContactDetailView
          contact={contact}
          events={events}
          jobs={jobs}
          jobEngagement={jobEngagement}
          emails={emails}
        />
      </div>
    </div>
  );
}
