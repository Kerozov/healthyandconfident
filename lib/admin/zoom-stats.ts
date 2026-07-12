import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type {
  ZoomAttendeeSummary,
  ZoomMeetingSummary,
  ZoomOverview,
  ZoomSessionRow,
} from "@/lib/admin/zoom-types";

export type {
  ZoomAttendeeSummary,
  ZoomMeetingSummary,
  ZoomOverview,
  ZoomSessionRow,
} from "@/lib/admin/zoom-types";

type RawRow = {
  id: string;
  contact_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  contacts: { email: string; name: string | null } | { email: string; name: string | null }[] | null;
};

function contactFromJoin(
  row: RawRow,
): { email: string; name: string | null } {
  const c = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  return { email: c?.email ?? "", name: c?.name ?? null };
}

function parseSessions(rows: RawRow[]): ZoomSessionRow[] {
  const sessions: ZoomSessionRow[] = [];

  for (const row of rows) {
    const meta = row.metadata ?? {};
    const meetingId =
      typeof meta.meeting_id === "string" && meta.meeting_id.trim()
        ? meta.meeting_id.trim()
        : "unknown";
    const durationMinutes =
      typeof meta.duration_minutes === "number" ? meta.duration_minutes : 0;
    const leaveTime =
      typeof meta.leave_time === "string" ? meta.leave_time : row.created_at;
    const joinTime =
      typeof meta.join_time === "string" ? meta.join_time : null;
    const contact = contactFromJoin(row);

    sessions.push({
      eventId: row.id,
      contactId: row.contact_id,
      email: contact.email,
      name: contact.name,
      meetingId,
      joinedAt: joinTime,
      leftAt: leaveTime,
      durationMinutes,
    });
  }

  return sessions;
}

async function loadZoomLeftRows(): Promise<RawRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("contact_events")
    .select("id, contact_id, created_at, metadata, contacts(email, name)")
    .eq("event_type", "zoom_left")
    .order("created_at", { ascending: false })
    .limit(500);

  return (data as RawRow[]) ?? [];
}

export async function getZoomOverview(): Promise<ZoomOverview> {
  const rows = await loadZoomLeftRows();
  const sessions = parseSessions(rows);

  const byMeeting = new Map<string, ZoomSessionRow[]>();
  const byContact = new Map<string, ZoomAttendeeSummary>();

  for (const session of sessions) {
    const list = byMeeting.get(session.meetingId) ?? [];
    list.push(session);
    byMeeting.set(session.meetingId, list);

    const key = session.contactId;
    const existing = byContact.get(key) ?? {
      contactId: session.contactId,
      email: session.email,
      name: session.name,
      sessionCount: 0,
      totalMinutes: 0,
      meetingIds: [],
    };
    existing.sessionCount += 1;
    existing.totalMinutes += session.durationMinutes;
    if (!existing.meetingIds.includes(session.meetingId)) {
      existing.meetingIds.push(session.meetingId);
    }
    byContact.set(key, existing);
  }

  const meetings: ZoomMeetingSummary[] = [...byMeeting.entries()]
    .map(([meetingId, list]) => {
      const totalMinutes = list.reduce((s, r) => s + r.durationMinutes, 0);
      const emails = new Set(list.map((r) => r.email));
      const times = list.map((r) => new Date(r.leftAt).getTime()).filter(Number.isFinite);
      return {
        meetingId,
        participantCount: emails.size,
        sessionCount: list.length,
        totalMinutes,
        avgMinutes: emails.size ? Math.round(totalMinutes / emails.size) : 0,
        firstAt: times.length
          ? new Date(Math.min(...times)).toISOString()
          : list[0]?.leftAt ?? "",
        lastAt: times.length
          ? new Date(Math.max(...times)).toISOString()
          : list[0]?.leftAt ?? "",
      };
    })
    .sort(
      (a, b) =>
        b.participantCount - a.participantCount ||
        b.totalMinutes - a.totalMinutes,
    );

  const topAttendees = [...byContact.values()]
    .sort(
      (a, b) =>
        b.totalMinutes - a.totalMinutes || b.sessionCount - a.sessionCount,
    )
    .slice(0, 20);

  const uniqueParticipants = byContact.size;
  const totalMinutes = sessions.reduce((s, r) => s + r.durationMinutes, 0);

  return {
    totalSessions: sessions.length,
    uniqueParticipants,
    totalMinutes,
    meetings,
    topAttendees,
    allSessions: sessions,
    recentSessions: sessions.slice(0, 30),
  };
}

export async function getZoomSessionsForMeeting(
  meetingId: string,
): Promise<ZoomSessionRow[]> {
  const rows = await loadZoomLeftRows();
  return parseSessions(rows)
    .filter((s) => s.meetingId === meetingId)
    .sort((a, b) => b.durationMinutes - a.durationMinutes);
}

/** Contact IDs that attended a given Zoom meeting. */
export async function getContactIdsForMeeting(
  meetingId: string,
): Promise<string[]> {
  const sessions = await getZoomSessionsForMeeting(meetingId);
  return [...new Set(sessions.map((s) => s.contactId))];
}

export async function getZoomMeetingOptions(): Promise<
  { meetingId: string; participantCount: number }[]
> {
  const overview = await getZoomOverview();
  return overview.meetings.map((m) => ({
    meetingId: m.meetingId,
    participantCount: m.participantCount,
  }));
}
