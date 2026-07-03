import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/email/cta-redirect";
import { createUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { cancelEmailJob } from "@/lib/worker/email";
import { cancelSmsJob } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

export type UnsubscribeResult =
  | { ok: true; status: "unsubscribed" | "already" }
  | { ok: false; reason: "not_found" | "invalid" };

export function unsubscribeLinkForEmail(
  email: string,
  locale: "bg" | "en",
): string | null {
  const token = createUnsubscribeToken(email);
  if (!token) return null;
  return `${siteOrigin()}/api/unsubscribe?token=${encodeURIComponent(token)}&locale=${locale}`;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .select("status")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  return (data as { status?: string } | null)?.status === "unsubscribed";
}

export async function filterSubscribedEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];

  const normalized = Array.from(
    new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  );
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("subscribers")
    .select("email")
    .in("email", normalized)
    .eq("status", "subscribed");

  const subscribed = new Set(
    ((data as { email: string }[] | null) ?? []).map((row) => row.email),
  );
  return normalized.filter((email) => subscribed.has(email));
}

async function cancelScheduledDeliveriesForEmail(email: string): Promise<void> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, worker_job_id, channel")
    .eq("email", email.trim().toLowerCase())
    .eq("status", "scheduled")
    .not("worker_job_id", "is", null);

  for (const row of data ?? []) {
    if (isNotificationWorkerConfigured()) {
      const jobId = row.worker_job_id as string;
      const ok =
        row.channel === "sms"
          ? await cancelSmsJob(jobId)
          : await cancelEmailJob(jobId);
      if (!ok) continue;
    }

    await supabase
      .from("automation_deliveries")
      .update({ status: "canceled" })
      .eq("id", row.id as string);
  }
}

export async function unsubscribeEmail(email: string): Promise<UnsubscribeResult> {
  const normalized = email.trim().toLowerCase();
  const supabase = getAdminClient();

  const { data: row } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("email", normalized)
    .maybeSingle();

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  if ((row as { status: string }).status === "unsubscribed") {
    await cancelScheduledDeliveriesForEmail(normalized);
    return { ok: true, status: "already" };
  }

  const { error } = await supabase
    .from("subscribers")
    .update({ status: "unsubscribed", consent: false })
    .eq("email", normalized);

  if (error) {
    return { ok: false, reason: "invalid" };
  }

  await cancelScheduledDeliveriesForEmail(normalized);
  return { ok: true, status: "unsubscribed" };
}
