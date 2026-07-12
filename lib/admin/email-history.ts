import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import {
  SEQUENCE_POST_PURCHASE_ONBOARDING,
  SEQUENCE_PRE_PAYMENT_REMINDERS,
} from "@/lib/contacts/types";
import type { PersonEmailItem, PersonEmailStatus } from "@/lib/admin/person-email";

export type { PersonEmailItem, PersonEmailStatus } from "@/lib/admin/person-email";

const SEQUENCE_TITLES: Record<string, string> = {
  [SEQUENCE_PRE_PAYMENT_REMINDERS]: "Напомняне за плащане",
  [SEQUENCE_POST_PURCHASE_ONBOARDING]: "Onboarding след покупка",
};

function isOpenedRow(row: {
  opened_at: string | null;
  recipient_status: string | null;
}): boolean {
  return Boolean(row.opened_at) || row.recipient_status === "opened";
}

function mapWorkerJobStatus(status: string): PersonEmailStatus {
  if (status === "sent") return "sent";
  if (status === "pending") return "pending";
  if (status === "canceled") return "canceled";
  if (status === "failed") return "failed";
  return "scheduled";
}

/** All email touchpoints for one person — automations, campaigns, payment reminders. */
export async function getPersonEmailHistory(
  email: string,
): Promise<PersonEmailItem[]> {
  const normalized = email.trim().toLowerCase();
  const supabase = getAdminClient();
  const items: PersonEmailItem[] = [];

  const { data: autoDeliveries } = await supabase
    .from("automation_deliveries")
    .select(
      "status, sent_at, scheduled_for, opened_at, click_count, recipient_status, worker_job_id, error, automations(name)",
    )
    .eq("email", normalized)
    .eq("channel", "email")
    .order("sent_at", { ascending: false })
    .limit(80);

  for (const row of (autoDeliveries as {
    status: PersonEmailStatus;
    sent_at: string;
    scheduled_for: string | null;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
    worker_job_id: string | null;
    error: string | null;
    automations: { name: string } | { name: string }[] | null;
  }[] | null) ?? []) {
    const auto = Array.isArray(row.automations)
      ? row.automations[0]
      : row.automations;
    items.push({
      kind: "automation",
      title: auto?.name ?? "Автоматизация",
      status: row.status,
      at: row.scheduled_for ?? row.sent_at,
      opened: row.status === "sent" && isOpenedRow(row),
      openedAt: row.opened_at,
      clicks: row.click_count ?? 0,
      error: row.error,
      workerJobId: row.worker_job_id,
    });
  }

  const { data: campDeliveries } = await supabase
    .from("campaign_deliveries")
    .select(
      "status, sent_at, opened_at, click_count, recipient_status, worker_job_id, email_campaigns(subject)",
    )
    .eq("email", normalized)
    .order("sent_at", { ascending: false })
    .limit(80);

  for (const row of (campDeliveries as {
    status: PersonEmailStatus;
    sent_at: string;
    opened_at: string | null;
    click_count: number;
    recipient_status: string | null;
    worker_job_id: string | null;
    email_campaigns: { subject: string } | { subject: string }[] | null;
  }[] | null) ?? []) {
    const camp = Array.isArray(row.email_campaigns)
      ? row.email_campaigns[0]
      : row.email_campaigns;
    items.push({
      kind: "campaign",
      title: camp?.subject ?? "Кампания",
      status: row.status,
      at: row.sent_at,
      opened: row.status === "sent" && isOpenedRow(row),
      openedAt: row.opened_at,
      clicks: row.click_count ?? 0,
      error: null,
      workerJobId: row.worker_job_id,
    });
  }

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (contact) {
    const { data: reminderJobs } = await supabase
      .from("contact_worker_jobs")
      .select("sequence_key, status, scheduled_at, worker_job_id, created_at")
      .eq("contact_id", (contact as { id: string }).id)
      .order("scheduled_at", { ascending: false })
      .limit(40);

    for (const row of (reminderJobs as {
      sequence_key: string;
      status: string;
      scheduled_at: string | null;
      worker_job_id: string;
      created_at: string;
    }[] | null) ?? []) {
      items.push({
        kind: "reminder",
        title: SEQUENCE_TITLES[row.sequence_key] ?? row.sequence_key,
        status: mapWorkerJobStatus(row.status),
        at: row.scheduled_at ?? row.created_at,
        opened: false,
        openedAt: null,
        clicks: 0,
        error: null,
        workerJobId: row.worker_job_id,
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 60);
}
