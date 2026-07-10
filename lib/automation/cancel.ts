import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { subscriberMatchesAutomationAudience } from "@/lib/automation/audience";
import { cancelEmailJob } from "@/lib/worker/email";
import { cancelSmsJob } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

async function cancelDeliveryRow(row: {
  id: string;
  worker_job_id: string | null;
  channel: string;
}): Promise<boolean> {
  if (row.worker_job_id && isNotificationWorkerConfigured()) {
    const ok =
      row.channel === "sms"
        ? await cancelSmsJob(row.worker_job_id)
        : await cancelEmailJob(row.worker_job_id);
    if (!ok) return false;
  }

  const supabase = getAdminClient();
  await supabase
    .from("automation_deliveries")
    .update({ status: "canceled" })
    .eq("id", row.id);
  return true;
}

/**
 * Cancel scheduled automation jobs when subscriber tags change and they no longer
 * match the automation audience (e.g. paid → added to an exclude group).
 */
export async function cancelIneligibleAutomationDeliveriesForSubscriber(
  email: string,
  tags: string[],
): Promise<{ canceled: number; checked: number }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { canceled: 0, checked: 0 };

  const supabase = getAdminClient();
  const [{ data: deliveries }, { data: segmentRows }, { data: groupRows }] =
    await Promise.all([
      supabase
        .from("automation_deliveries")
        .select("id, automation_id, worker_job_id, channel")
        .eq("email", normalized)
        .eq("status", "scheduled"),
      supabase.from("segments").select("*"),
      supabase.from("segment_groups").select("*"),
    ]);

  const rows = deliveries ?? [];
  if (rows.length === 0) return { canceled: 0, checked: 0 };

  const automationIds = Array.from(new Set(rows.map((r) => r.automation_id as string)));
  const { data: automationRows } = await supabase
    .from("automations")
    .select("*")
    .in("id", automationIds);

  const automationsById = new Map(
    ((automationRows as Automation[]) ?? []).map((a) => [a.id, a]),
  );
  const segments = (segmentRows as Segment[]) ?? [];
  const groups = (groupRows as SegmentGroup[]) ?? [];

  let canceled = 0;
  for (const row of rows) {
    const automation = automationsById.get(row.automation_id as string);
    if (!automation) continue;

    if (subscriberMatchesAutomationAudience(automation, tags, segments, groups)) {
      continue;
    }

    const ok = await cancelDeliveryRow({
      id: row.id as string,
      worker_job_id: row.worker_job_id as string | null,
      channel: row.channel as string,
    });
    if (ok) canceled += 1;
  }

  return { canceled, checked: rows.length };
}

/** Cancel all pending worker jobs for an automation and mark deliveries canceled. */
export async function cancelAutomationScheduledJobs(
  automationId: string,
): Promise<{ canceled: number }> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, worker_job_id, channel")
    .eq("automation_id", automationId)
    .eq("status", "scheduled")
    .not("worker_job_id", "is", null);

  let canceled = 0;

  for (const row of data ?? []) {
    const ok = await cancelDeliveryRow({
      id: row.id as string,
      worker_job_id: row.worker_job_id as string | null,
      channel: row.channel as string,
    });
    if (ok) canceled += 1;
  }

  return { canceled };
}
