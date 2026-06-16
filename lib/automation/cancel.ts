import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { cancelEmailJob } from "@/lib/worker/email";
import { cancelSmsJob } from "@/lib/worker/sms";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";

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
    const jobId = row.worker_job_id as string;
    if (isNotificationWorkerConfigured()) {
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
    canceled += 1;
  }

  return { canceled };
}
