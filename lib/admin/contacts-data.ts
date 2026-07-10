import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { getJobReport } from "@/lib/notification-worker";
import type {
  Contact,
  ContactEvent,
  ContactListRow,
  ContactWorkerJob,
} from "@/lib/contacts/types";

export type ContactListFilters = {
  paymentStatus?: "unpaid" | "paid" | "all";
  hasPendingReminders?: boolean;
  zoomAttended?: boolean | "all";
};

export async function getContacts(
  filters: ContactListFilters = {},
): Promise<ContactListRow[]> {
  const supabase = getAdminClient();
  let q = supabase.from("contacts").select("*").order("created_at", { ascending: false });

  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    q = q.eq("payment_status", filters.paymentStatus);
  }
  if (filters.zoomAttended === true) {
    q = q.eq("zoom_attended", true);
  } else if (filters.zoomAttended === false) {
    q = q.eq("zoom_attended", false);
  }

  const { data: contacts } = await q;
  const rows = (contacts as Contact[]) ?? [];

  const { data: pendingJobs } = await supabase
    .from("contact_worker_jobs")
    .select("contact_id")
    .eq("sequence_key", "pre-payment-reminders")
    .eq("status", "pending");

  const pendingByContact = new Map<string, number>();
  for (const j of (pendingJobs as { contact_id: string }[]) ?? []) {
    pendingByContact.set(j.contact_id, (pendingByContact.get(j.contact_id) ?? 0) + 1);
  }

  let result: ContactListRow[] = rows.map((c) => ({
    ...c,
    pending_reminder_count: pendingByContact.get(c.id) ?? 0,
  }));

  if (filters.hasPendingReminders === true) {
    result = result.filter((c) => c.pending_reminder_count > 0);
  } else if (filters.hasPendingReminders === false) {
    result = result.filter((c) => c.pending_reminder_count === 0);
  }

  return result;
}

export async function getContactDetail(contactId: string): Promise<{
  contact: Contact | null;
  events: ContactEvent[];
  jobs: ContactWorkerJob[];
}> {
  const supabase = getAdminClient();

  const [{ data: contact }, { data: events }, { data: jobs }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
    supabase
      .from("contact_events")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_worker_jobs")
      .select("*")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    contact: (contact as Contact | null) ?? null,
    events: (events as ContactEvent[]) ?? [],
    jobs: (jobs as ContactWorkerJob[]) ?? [],
  };
}

export type JobEngagement = {
  jobId: string;
  status: string;
  opened: number;
  sent: number;
  failed: number;
} | null;

export async function getContactJobEngagement(
  workerJobId: string,
): Promise<JobEngagement> {
  const report = await getJobReport(workerJobId);
  if (!report) return null;
  return {
    jobId: report.jobId,
    status: report.status,
    opened: report.tracking.opened,
    sent: report.tracking.sent,
    failed: report.tracking.failed,
  };
}
