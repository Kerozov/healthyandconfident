import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { ZoomWebhookLog } from "@/lib/supabase/types";

export type ZoomWebhookLogRow = ZoomWebhookLog;

export function participantEmail(
  participant: Record<string, unknown> | undefined,
): string | null {
  if (!participant) return null;
  const fields = ["email", "user_email", "customer_key"];
  for (const key of fields) {
    const value = participant[key];
    if (typeof value === "string" && value.includes("@")) {
      return value.trim().toLowerCase();
    }
  }
  return null;
}

export async function logZoomWebhook(input: {
  zoomEvent: string;
  meetingId?: string | null;
  email?: string | null;
  status: string;
  detail?: string | null;
}): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("zoom_webhook_log").insert({
    zoom_event: input.zoomEvent,
    meeting_id: input.meetingId ?? null,
    email: input.email ?? null,
    status: input.status,
    detail: input.detail ?? null,
  });
}

export async function recordZoomSession(input: {
  contactId?: string | null;
  meetingId: string;
  email?: string | null;
  participantName?: string | null;
  joinTime?: string | null;
  leaveTime: string;
  durationMinutes: number;
  zoomEvent: string;
}): Promise<void> {
  const supabase = getAdminClient();
  await supabase.from("zoom_session_events").insert({
    contact_id: input.contactId ?? null,
    meeting_id: input.meetingId,
    email: input.email ?? null,
    participant_name: input.participantName ?? null,
    join_time: input.joinTime ?? null,
    leave_time: input.leaveTime,
    duration_minutes: input.durationMinutes,
    zoom_event: input.zoomEvent,
  });
}


export async function getRecentZoomWebhookLog(
  limit = 15,
): Promise<ZoomWebhookLogRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("zoom_webhook_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ZoomWebhookLogRow[]) ?? [];
}
