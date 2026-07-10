import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ContactEvent, ContactEventType } from "@/lib/contacts/types";

export async function recordContactEvent(input: {
  contactId: string;
  eventType: ContactEventType;
  source?: string | null;
  campaignId?: string | null;
  workerJobId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ContactEvent> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("contact_events")
    .insert({
      contact_id: input.contactId,
      event_type: input.eventType,
      source: input.source ?? null,
      campaign_id: input.campaignId ?? null,
      worker_job_id: input.workerJobId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ContactEvent;
}
