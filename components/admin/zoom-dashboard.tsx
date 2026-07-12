"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { formatMeetingLabel } from "@/lib/admin/zoom-display";
import type { ZoomOverview, ZoomSessionRow } from "@/lib/admin/zoom-types";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-forest-700">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

export function ZoomDashboard({ overview }: { overview: ZoomOverview }) {
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);

  const meetingSessions = useMemo(() => {
    if (!selectedMeeting) return [];
    return overview.allSessions.filter((s) => s.meetingId === selectedMeeting);
  }, [overview.allSessions, selectedMeeting]);

  const selectedSummary = overview.meetings.find(
    (m) => m.meetingId === selectedMeeting,
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-soft">
        Статистика от Zoom webhook — кой колко е стоял и в коя среща. Имейлът в
        Zoom трябва да съвпада с този в сайта.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Zoom сесии" value={overview.totalSessions} />
        <Stat
          label="Уникални участници"
          value={overview.uniqueParticipants}
        />
        <Stat
          label="Общо време"
          value={`${overview.totalMinutes} мин.`}
        />
        <Stat label="Различни срещи" value={overview.meetings.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold">По среща</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Кликни среща за детайли. Сортирано по брой участници.
          </p>
          {overview.meetings.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Няма Zoom данни още.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-3">Meeting ID</th>
                    <th className="py-2 pr-3">Хора</th>
                    <th className="py-2 pr-3">Общо мин.</th>
                    <th className="py-2 pr-3">Средно</th>
                    <th className="py-2">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.meetings.map((m) => (
                    <tr
                      key={m.meetingId}
                      className={cn(
                        "cursor-pointer border-b border-ink/5 last:border-0 hover:bg-cream/40",
                        selectedMeeting === m.meetingId && "bg-forest-500/5",
                      )}
                      onClick={() =>
                        setSelectedMeeting(
                          selectedMeeting === m.meetingId ? null : m.meetingId,
                        )
                      }
                    >
                      <td className="py-2.5 pr-3 font-mono text-xs">
                        {formatMeetingLabel(m.meetingId)}
                      </td>
                      <td className="py-2.5 pr-3 font-medium">
                        {m.participantCount}
                      </td>
                      <td className="py-2.5 pr-3">{m.totalMinutes}</td>
                      <td className="py-2.5 pr-3 text-ink-soft">
                        {m.avgMinutes}
                      </td>
                      <td className="py-2.5 text-xs text-ink-soft">
                        {m.lastAt ? formatDate(m.lastAt, "bg") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold">
            Топ участници (време)
          </h2>
          {overview.topAttendees.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Няма данни.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-3">Имейл</th>
                    <th className="py-2 pr-3">Сесии</th>
                    <th className="py-2 pr-3">Общо мин.</th>
                    <th className="py-2">Срещи</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topAttendees.map((a) => (
                    <tr key={a.contactId} className="border-b border-ink/5">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/admin/contacts/${a.contactId}`}
                          className="font-medium text-forest-700 hover:underline"
                        >
                          {a.email}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">{a.sessionCount}</td>
                      <td className="py-2.5 pr-3 font-medium text-forest-700">
                        {a.totalMinutes}
                      </td>
                      <td className="py-2.5 text-xs text-ink-soft">
                        {a.meetingIds.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selectedMeeting && selectedSummary && (
        <MeetingDetail
          meetingId={selectedMeeting}
          summary={selectedSummary}
          sessions={meetingSessions}
        />
      )}

      <section className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold">Последни сесии</h2>
        <SessionTable sessions={overview.recentSessions} />
      </section>
    </div>
  );
}

function MeetingDetail({
  meetingId,
  summary,
  sessions,
}: {
  meetingId: string;
  summary: {
    participantCount: number;
    totalMinutes: number;
    avgMinutes: number;
    sessionCount: number;
  };
  sessions: ZoomSessionRow[];
}) {
  const sorted = [...sessions].sort(
    (a, b) => b.durationMinutes - a.durationMinutes,
  );

  return (
    <section className="rounded-2xl border border-forest-500/20 bg-forest-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Детайли за среща</h2>
          <p className="mt-1 font-mono text-xs text-ink-soft">{meetingId}</p>
        </div>
        <Link
          href={`/admin/contacts?meeting=${encodeURIComponent(meetingId)}`}
          className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          Филтрирай контакти
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <span>
          <strong>{summary.participantCount}</strong> участници
        </span>
        <span>
          <strong>{summary.totalMinutes}</strong> мин. общо
        </span>
        <span>
          средно <strong>{summary.avgMinutes}</strong> мин./човек
        </span>
        <span>
          <strong>{summary.sessionCount}</strong> сесии
        </span>
      </div>
      <div className="mt-4">
        <SessionTable sessions={sorted} showRank />
      </div>
      {sorted.length === 0 && (
        <p className="text-sm text-ink-soft">Няма записани сесии за тази среща.</p>
      )}
    </section>
  );
}

function SessionTable({
  sessions,
  showRank,
}: {
  sessions: ZoomSessionRow[];
  showRank?: boolean;
}) {
  if (sessions.length === 0) {
    return <p className="mt-3 text-sm text-ink-soft">Няма сесии.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
            {showRank && <th className="py-2 pr-3">#</th>}
            <th className="py-2 pr-3">Имейл</th>
            <th className="py-2 pr-3">Meeting</th>
            <th className="py-2 pr-3">Влязъл</th>
            <th className="py-2 pr-3">Излязъл</th>
            <th className="py-2">Минути</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={s.eventId} className="border-b border-ink/5">
              {showRank && (
                <td className="py-2.5 pr-3 text-ink-soft">{i + 1}</td>
              )}
              <td className="py-2.5 pr-3">
                <Link
                  href={`/admin/contacts/${s.contactId}`}
                  className="text-forest-700 hover:underline"
                >
                  {s.email}
                </Link>
              </td>
              <td className="py-2.5 pr-3 font-mono text-xs text-ink-soft">
                {formatMeetingLabel(s.meetingId)}
              </td>
              <td className="py-2.5 pr-3 text-xs text-ink-soft">
                {s.joinedAt ? formatDate(s.joinedAt, "bg") : "—"}
              </td>
              <td className="py-2.5 pr-3 text-xs text-ink-soft">
                {formatDate(s.leftAt, "bg")}
              </td>
              <td className="py-2.5 font-medium text-forest-700">
                {s.durationMinutes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
