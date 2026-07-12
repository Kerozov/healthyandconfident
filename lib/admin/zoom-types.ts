export type ZoomSessionRow = {
  eventId: string;
  contactId: string;
  email: string;
  name: string | null;
  meetingId: string;
  joinedAt: string | null;
  leftAt: string;
  durationMinutes: number;
};

export type ZoomMeetingSummary = {
  meetingId: string;
  participantCount: number;
  sessionCount: number;
  totalMinutes: number;
  avgMinutes: number;
  firstAt: string;
  lastAt: string;
};

export type ZoomAttendeeSummary = {
  contactId: string;
  email: string;
  name: string | null;
  sessionCount: number;
  totalMinutes: number;
  meetingIds: string[];
};

export type ZoomOverview = {
  totalSessions: number;
  uniqueParticipants: number;
  totalMinutes: number;
  meetings: ZoomMeetingSummary[];
  topAttendees: ZoomAttendeeSummary[];
  allSessions: ZoomSessionRow[];
  recentSessions: ZoomSessionRow[];
};
