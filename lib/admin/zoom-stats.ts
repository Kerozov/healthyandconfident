import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { formatMeetingLabel } from "@/lib/admin/zoom-display";
import type {
  ZoomAttendeeMeeting,
  ZoomAttendeeSummary,
  ZoomMeetingSummary,
  ZoomOverview,
  ZoomSessionRow,
} from "@/lib/admin/zoom-types";

export type {
  ZoomAttendeeMeeting,
  ZoomAttendeeSummary,
  ZoomMeetingParticipant,
  ZoomMeetingSummary,
  ZoomOverview,
  ZoomSessionRow,
} from "@/lib/admin/zoom-types";

type SessionDbRow = {
  id: string;
  contact_id: string | null;
  meeting_id: string;
  email: string | null;
  participant_name: string | null;
  join_time: string | null;
  leave_time: string;
  duration_minutes: number;
};

type AttendeeAcc = {
  contactId: string;
  email: string;
  name: string | null;
  sessionCount: number;
  totalMinutes: number;
  byMeeting: Map<string, { minutes: number; lastAt: string }>;
};

function sessionFromDb(row: SessionDbRow): ZoomSessionRow {
  return {
    eventId: row.id,
    contactId: row.contact_id ?? "",
    email: row.email ?? "",
    name: row.participant_name,
    meetingId: row.meeting_id.trim() || "unknown",
    joinedAt: row.join_time,
    leftAt: row.leave_time,
    durationMinutes: row.duration_minutes,
  };
}

function meetingTitleFromSessions(sessions: ZoomSessionRow[]): string {
  const topic = sessions.find((s) => !s.email && s.name)?.name;
  const meetingId = sessions[0]?.meetingId ?? "unknown";
  return topic?.trim() || formatMeetingLabel(meetingId);
}

function attendeeFromAcc(
  key: string,
  acc: AttendeeAcc,
  meetingTitles: Map<string, string>,
): ZoomAttendeeSummary {
  const meetings = [...acc.byMeeting.entries()]
    .map(([meetingId, row]) => ({
      meetingId,
      title: meetingTitles.get(meetingId) ?? formatMeetingLabel(meetingId),
      minutes: row.minutes,
      lastAt: row.lastAt,
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  return {
    contactId: acc.contactId,
    email: acc.email,
    name: acc.name,
    sessionCount: acc.sessionCount,
    totalMinutes: acc.totalMinutes,
    meetingIds: meetings.map((m) => m.meetingId),
    meetings,
  };
}

async function loadZoomSessions(): Promise<ZoomSessionRow[]> {
  const supabase = getAdminClient();
  const { data: zoomRows } = await supabase
    .from("zoom_session_events")
    .select(
      "id, contact_id, meeting_id, email, participant_name, join_time, leave_time, duration_minutes",
    )
    .order("leave_time", { ascending: false })
    .limit(500);

  if (zoomRows && zoomRows.length > 0) {
    return (zoomRows as SessionDbRow[]).map(sessionFromDb);
  }

  const rows = await loadZoomLeftRowsLegacy();
  return parseSessions(rows);
}

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

async function loadZoomLeftRowsLegacy(): Promise<RawRow[]> {
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
  const sessions = await loadZoomSessions();

  const byMeeting = new Map<string, ZoomSessionRow[]>();
  const byContact = new Map<string, AttendeeAcc>();

  for (const session of sessions) {
    const list = byMeeting.get(session.meetingId) ?? [];
    list.push(session);
    byMeeting.set(session.meetingId, list);

    if (!session.email) continue;

    const key = session.email.toLowerCase();
    const existing = byContact.get(key) ?? {
      contactId: session.contactId,
      email: session.email,
      name: session.name,
      sessionCount: 0,
      totalMinutes: 0,
      byMeeting: new Map(),
    };
    existing.sessionCount += 1;
    existing.totalMinutes += session.durationMinutes;
    if (!existing.contactId && session.contactId) {
      existing.contactId = session.contactId;
    }
    if (!existing.name && session.name) {
      existing.name = session.name;
    }

    const meetingRow = existing.byMeeting.get(session.meetingId) ?? {
      minutes: 0,
      lastAt: session.leftAt,
    };
    meetingRow.minutes += session.durationMinutes;
    if (session.leftAt > meetingRow.lastAt) {
      meetingRow.lastAt = session.leftAt;
    }
    existing.byMeeting.set(session.meetingId, meetingRow);
    byContact.set(key, existing);
  }

  const meetingTitles = new Map<string, string>();
  for (const [meetingId, list] of byMeeting.entries()) {
    meetingTitles.set(meetingId, meetingTitleFromSessions(list));
  }

  const meetings: ZoomMeetingSummary[] = [...byMeeting.entries()]
    .map(([meetingId, list]) => {
      const people = new Set(
        list.filter((r) => r.email).map((r) => r.email.toLowerCase()),
      );
      const totalMinutes = list.reduce((s, r) => s + r.durationMinutes, 0);
      const times = list.map((r) => new Date(r.leftAt).getTime()).filter(Number.isFinite);
      return {
        meetingId,
        title: meetingTitles.get(meetingId) ?? formatMeetingLabel(meetingId),
        participantCount: people.size,
        sessionCount: list.length,
        totalMinutes,
        avgMinutes: people.size ? Math.round(totalMinutes / people.size) : totalMinutes,
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
        b.lastAt.localeCompare(a.lastAt) ||
        b.participantCount - a.participantCount,
    );

  const allAttendees = [...byContact.entries()]
    .map(([key, acc]) => attendeeFromAcc(key, acc, meetingTitles))
    .sort(
      (a, b) =>
        b.totalMinutes - a.totalMinutes || b.sessionCount - a.sessionCount,
    );

  const uniqueParticipants = allAttendees.length;
  const totalMinutes = sessions.reduce((s, r) => s + r.durationMinutes, 0);

  return {
    totalSessions: sessions.length,
    uniqueParticipants,
    totalMinutes,
    meetings,
    allAttendees,
    topAttendees: allAttendees.slice(0, 20),
    allSessions: sessions,
    recentSessions: sessions.slice(0, 30),
  };
}

export async function getZoomSessionsForMeeting(
  meetingId: string,
): Promise<ZoomSessionRow[]> {
  const sessions = await loadZoomSessions();
  return sessions
    .filter((s) => s.meetingId === meetingId)
    .sort((a, b) => b.durationMinutes - a.durationMinutes);
}

export async function getZoomSessionsForContact(
  contactId: string,
  email: string,
): Promise<ZoomSessionRow[]> {
  const normalized = email.trim().toLowerCase();
  const sessions = await loadZoomSessions();
  return sessions
    .filter(
      (s) =>
        s.email &&
        (s.contactId === contactId || s.email.toLowerCase() === normalized),
    )
    .sort((a, b) => b.leftAt.localeCompare(a.leftAt));
}

export async function getContactIdsForMeeting(
  meetingId: string,
): Promise<string[]> {
  const sessions = await getZoomSessionsForMeeting(meetingId);
  return [...new Set(sessions.map((s) => s.contactId).filter(Boolean))];
}

export async function getContactZoomMeetings(
  contactId: string,
  email: string,
): Promise<ZoomAttendeeMeeting[]> {
  const [sessions, overview] = await Promise.all([
    getZoomSessionsForContact(contactId, email),
    getZoomOverview(),
  ]);
  const titles = new Map(overview.meetings.map((m) => [m.meetingId, m.title]));
  const map = new Map<string, { minutes: number; lastAt: string }>();

  for (const session of sessions) {
    const row = map.get(session.meetingId) ?? {
      minutes: 0,
      lastAt: session.leftAt,
    };
    row.minutes += session.durationMinutes;
    if (session.leftAt > row.lastAt) row.lastAt = session.leftAt;
    map.set(session.meetingId, row);
  }

  return [...map.entries()]
    .map(([meetingId, row]) => ({
      meetingId,
      title: titles.get(meetingId) ?? formatMeetingLabel(meetingId),
      minutes: row.minutes,
      lastAt: row.lastAt,
    }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
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
