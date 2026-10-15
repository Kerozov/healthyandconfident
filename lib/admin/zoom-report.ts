/**
 * Zoom присъствие — сметките без база, за да могат да се проверят със скрипт
 * (`bun run verify:zoom`).
 *
 * `zoom_session_events` пази по един ред на излизане (participant_left) плюс
 * един ред „среща приключи“ (meeting.ended) с начало и край на срещата. Два
 * капана, които старият отчет не хващаше:
 *  - Повтаряща се среща (или личната стая) има едно и също Meeting ID всяка
 *    седмица — групирането по ID слепваше всички седмици в една „среща“.
 *    Тук всяка проведена сесия е отделна: по реда „среща приключи“, а ако
 *    него го няма — по участниците, разделени с поне 2 часа празно.
 *  - Повечето хора влизат в Zoom без имейл. Брояха се само тези с имейл;
 *    сега се броят и по име.
 * Повторните влизания на един човек се сливат, за да не се брои време двойно.
 */

export type ZoomEventRow = {
  id: string;
  contactId: string | null;
  meetingId: string;
  email: string | null;
  name: string | null;
  joinedAt: string | null;
  leftAt: string;
  durationMinutes: number;
  /** `meeting.ended` = ред за самата среща (начало/край, тема в `name`). */
  zoomEvent: string | null;
};

export type ZoomSessionAttendee = {
  personKey: string;
  name: string | null;
  email: string | null;
  contactId: string | null;
  minutes: number;
  /** 0–100 от продължителността на сесията; null ако не я знаем. */
  stayPct: number | null;
  joins: number;
  firstJoin: string | null;
  lastLeave: string | null;
};

export type ZoomSession = {
  id: string;
  meetingId: string;
  topic: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  attendees: ZoomSessionAttendee[];
  avgMinutes: number;
  avgStayPct: number | null;
};

export type ZoomPerson = {
  key: string;
  name: string | null;
  email: string | null;
  contactId: string | null;
  sessions: number;
  totalMinutes: number;
  avgMinutes: number;
  avgStayPct: number | null;
  /** На колко от сесиите след първото си идване е бил (0–100). */
  attendanceRate: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sessionIds: string[];
};

export type ZoomReport = {
  totals: {
    sessions: number;
    uniquePeople: number;
    avgAttendees: number;
    returningPeople: number;
    returningRate: number;
    totalMinutes: number;
    avgStayPct: number | null;
  };
  sessions: ZoomSession[];
  people: ZoomPerson[];
};

type Segment = { start: number; end: number };

const MINUTE = 60_000;
const SESSION_GAP = 2 * 60 * MINUTE;
const MATCH_SLACK = 30 * MINUTE;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ms(value: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function segmentOf(row: ZoomEventRow): Segment | null {
  const end = ms(row.leftAt);
  if (end == null) return null;
  const start =
    ms(row.joinedAt) ?? end - Math.max(0, row.durationMinutes) * MINUTE;
  return { start: Math.min(start, end), end };
}

function isMeetingMarker(row: ZoomEventRow): boolean {
  return (
    Boolean(row.zoomEvent && row.zoomEvent.includes("ended")) && !row.email
  );
}

function merge(segments: Segment[]): Segment[] {
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

const total = (segments: Segment[]) =>
  segments.reduce((sum, s) => sum + (s.end - s.start), 0);

type Bucket = {
  meetingId: string;
  topic: string | null;
  window: Segment | null;
  rows: { row: ZoomEventRow; seg: Segment }[];
};

export function buildZoomReport(rows: ZoomEventRow[]): ZoomReport {
  // Един човек без имейл влиза с име; ако точно един имейл е ползвал това
  // име, приемаме, че е той.
  const emailsByName = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!row.email || !row.name || isMeetingMarker(row)) continue;
    const key = normalizeName(row.name);
    const set = emailsByName.get(key) ?? new Set<string>();
    set.add(row.email.toLowerCase());
    emailsByName.set(key, set);
  }

  const byMeeting = new Map<string, ZoomEventRow[]>();
  for (const row of rows) {
    const list = byMeeting.get(row.meetingId) ?? [];
    list.push(row);
    byMeeting.set(row.meetingId, list);
  }

  const sessions: ZoomSession[] = [];

  for (const [meetingId, list] of byMeeting) {
    const buckets: Bucket[] = [];
    for (const marker of list.filter(isMeetingMarker)) {
      const seg = segmentOf(marker);
      if (seg)
        buckets.push({ meetingId, topic: marker.name, window: seg, rows: [] });
    }

    const loose: { row: ZoomEventRow; seg: Segment }[] = [];
    for (const row of list) {
      if (isMeetingMarker(row)) continue;
      const seg = segmentOf(row);
      if (!seg) continue;
      const bucket = buckets.find(
        (b) =>
          b.window &&
          seg.end >= b.window.start - MATCH_SLACK &&
          seg.start <= b.window.end + MATCH_SLACK,
      );
      if (bucket) bucket.rows.push({ row, seg });
      else loose.push({ row, seg });
    }

    // Без ред „среща приключи“ (пропуснат webhook) — разделяме по празнините.
    loose.sort((a, b) => a.seg.start - b.seg.start);
    let current: Bucket | null = null;
    let currentEnd = -Infinity;
    for (const item of loose) {
      if (!current || item.seg.start - currentEnd > SESSION_GAP) {
        current = { meetingId, topic: null, window: null, rows: [] };
        buckets.push(current);
        currentEnd = -Infinity;
      }
      current.rows.push(item);
      currentEnd = Math.max(currentEnd, item.seg.end);
    }

    for (const bucket of buckets) {
      const people = new Map<
        string,
        {
          name: string | null;
          email: string | null;
          contactId: string | null;
          segs: Segment[];
        }
      >();
      for (const { row, seg } of bucket.rows) {
        const email =
          row.email?.toLowerCase() ||
          (row.name
            ? (() => {
                const set = emailsByName.get(normalizeName(row.name!));
                return set && set.size === 1 ? [...set][0] : null;
              })()
            : null);
        const key = email
          ? `e:${email}`
          : row.name
            ? `n:${normalizeName(row.name)}`
            : `r:${row.id}`;
        const entry = people.get(key) ?? {
          name: row.name,
          email,
          contactId: row.contactId,
          segs: [],
        };
        if (!entry.name && row.name) entry.name = row.name;
        if (!entry.contactId && row.contactId) entry.contactId = row.contactId;
        entry.segs.push(seg);
        people.set(key, entry);
      }
      if (people.size === 0) continue;

      const allSegs = [...people.values()].flatMap((p) => p.segs);
      const start =
        bucket.window?.start ?? Math.min(...allSegs.map((s) => s.start));
      const end = bucket.window?.end ?? Math.max(...allSegs.map((s) => s.end));
      const sessionMs = Math.max(0, end - start);

      const attendees: ZoomSessionAttendee[] = [...people.entries()].map(
        ([key, p]) => {
          const merged = merge(p.segs);
          const spent = total(merged);
          return {
            personKey: key,
            name: p.name,
            email: p.email,
            contactId: p.contactId,
            minutes: Math.round(spent / MINUTE),
            stayPct:
              sessionMs > 0
                ? Math.min(100, Math.round((spent / sessionMs) * 100))
                : null,
            joins: p.segs.length,
            firstJoin: new Date(merged[0].start).toISOString(),
            lastLeave: new Date(merged[merged.length - 1].end).toISOString(),
          };
        },
      );
      attendees.sort(
        (a, b) =>
          b.minutes - a.minutes || (a.name ?? "").localeCompare(b.name ?? ""),
      );
      const stays = attendees
        .map((a) => a.stayPct)
        .filter((v): v is number => v != null);

      sessions.push({
        id: `${meetingId}:${new Date(start).toISOString()}`,
        meetingId,
        // Сесия без ред „среща приключи“ взима темата на същата среща от друга седмица.
        topic:
          bucket.topic?.trim() ||
          buckets.find((b) => b.topic?.trim())?.topic?.trim() ||
          "Zoom среща",
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(end).toISOString(),
        durationMinutes: Math.round(sessionMs / MINUTE),
        attendees,
        avgMinutes: Math.round(
          attendees.reduce((s, a) => s + a.minutes, 0) / attendees.length,
        ),
        avgStayPct: stays.length
          ? Math.round(stays.reduce((s, v) => s + v, 0) / stays.length)
          : null,
      });
    }
  }

  sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return summarizeSessions(sessions);
}

/** Общи числа и хора от списък сесии (най-новата първа). */
export function summarizeSessions(sessions: ZoomSession[]): ZoomReport {
  const chronological = [...sessions].reverse();
  const map = new Map<
    string,
    ZoomPerson & { stays: number[]; firstIndex: number }
  >();

  chronological.forEach((session, index) => {
    for (const a of session.attendees) {
      const entry = map.get(a.personKey) ?? {
        key: a.personKey,
        name: a.name,
        email: a.email,
        contactId: a.contactId,
        sessions: 0,
        totalMinutes: 0,
        avgMinutes: 0,
        avgStayPct: null,
        attendanceRate: 0,
        firstSeenAt: session.startedAt,
        lastSeenAt: session.startedAt,
        sessionIds: [],
        stays: [],
        firstIndex: index,
      };
      entry.sessions += 1;
      entry.totalMinutes += a.minutes;
      if (a.stayPct != null) entry.stays.push(a.stayPct);
      if (!entry.name && a.name) entry.name = a.name;
      if (!entry.contactId && a.contactId) entry.contactId = a.contactId;
      entry.lastSeenAt = session.startedAt;
      entry.sessionIds.push(session.id);
      map.set(a.personKey, entry);
    }
  });

  const people: ZoomPerson[] = [...map.values()]
    .map(({ stays, firstIndex, ...p }) => {
      const possible = chronological.length - firstIndex;
      return {
        ...p,
        avgMinutes: p.sessions ? Math.round(p.totalMinutes / p.sessions) : 0,
        avgStayPct: stays.length
          ? Math.round(stays.reduce((s, v) => s + v, 0) / stays.length)
          : null,
        attendanceRate:
          possible > 0 ? Math.round((p.sessions / possible) * 100) : 0,
      };
    })
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        b.totalMinutes - a.totalMinutes ||
        b.lastSeenAt.localeCompare(a.lastSeenAt),
    );

  const attendances = sessions.reduce((s, x) => s + x.attendees.length, 0);
  const stays = sessions
    .flatMap((s) => s.attendees.map((a) => a.stayPct))
    .filter((v): v is number => v != null);
  const returningPeople = people.filter((p) => p.sessions >= 2).length;

  return {
    totals: {
      sessions: sessions.length,
      uniquePeople: people.length,
      avgAttendees: sessions.length
        ? Math.round((attendances / sessions.length) * 10) / 10
        : 0,
      returningPeople,
      returningRate: people.length
        ? Math.round((returningPeople / people.length) * 100)
        : 0,
      totalMinutes: sessions.reduce(
        (s, x) => s + x.attendees.reduce((m, a) => m + a.minutes, 0),
        0,
      ),
      avgStayPct: stays.length
        ? Math.round(stays.reduce((s, v) => s + v, 0) / stays.length)
        : null,
    },
    sessions,
    people,
  };
}

/** Само сесиите след `sinceMs`; хората се преизчисляват за тях. */
export function filterZoomReport(
  report: ZoomReport,
  sinceMs: number | null,
): ZoomReport {
  if (sinceMs == null) return report;
  return summarizeSessions(
    report.sessions.filter((s) => new Date(s.startedAt).getTime() >= sinceMs),
  );
}

/** Сесиите от последните `days` дни (`0` = всички). */
export function zoomReportForDays(
  report: ZoomReport,
  days: number,
  now = Date.now(),
): ZoomReport {
  return filterZoomReport(
    report,
    days ? now - days * 24 * 60 * 60 * 1000 : null,
  );
}
