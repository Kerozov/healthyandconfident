"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, cn } from "@/lib/utils";
import { formatMeetingLabel } from "@/lib/admin/zoom-display";
import type {
  ZoomAttendeeSummary,
  ZoomMeetingParticipant,
  ZoomOverview,
  ZoomSessionRow,
} from "@/lib/admin/zoom-types";

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

function participantsForMeeting(sessions: ZoomSessionRow[]): ZoomMeetingParticipant[] {
  const map = new Map<string, ZoomMeetingParticipant>();

  for (const s of sessions) {
    if (!s.email) continue;
    const key = s.email.toLowerCase();
    const existing = map.get(key) ?? {
      email: s.email,
      name: s.name,
      contactId: s.contactId,
      totalMinutes: 0,
      visits: 0,
    };
    existing.totalMinutes += s.durationMinutes;
    existing.visits += 1;
    if (!existing.contactId && s.contactId) existing.contactId = s.contactId;
    if (!existing.name && s.name) existing.name = s.name;
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function ZoomDashboard({ overview }: { overview: ZoomOverview }) {
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<string | null>(null);

  const meetingSessions = useMemo(() => {
    if (!selectedMeeting) return [];
    return overview.allSessions.filter((s) => s.meetingId === selectedMeeting);
  }, [overview.allSessions, selectedMeeting]);

  const selectedSummary = overview.meetings.find(
    (m) => m.meetingId === selectedMeeting,
  );

  const meetingParticipants = useMemo(
    () => participantsForMeeting(meetingSessions),
    [meetingSessions],
  );

  const selectedPerson = overview.allAttendees.find(
    (a) => a.email.toLowerCase() === selectedAttendee?.toLowerCase(),
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-soft">
        Виж кой е бил на коя среща и колко минути е останал. За отделни хора
        трябва да влязат в Zoom със същия имейл, който имат в сайта.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Проведени срещи" value={overview.meetings.length} />
        <Stat label="Участници" value={overview.uniqueParticipants} />
        <Stat label="Общо време" value={`${overview.totalMinutes} мин.`} />
        <Stat label="Записи" value={overview.totalSessions} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Срещи</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Кликни среща — виждаш кой е участвал и колко е стоял.
          </p>
          {overview.meetings.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">Все още няма срещи.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-3">Среща</th>
                    <th className="py-2 pr-3">Хора</th>
                    <th className="py-2 pr-3">Минути</th>
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
                      onClick={() => {
                        setSelectedAttendee(null);
                        setSelectedMeeting(
                          selectedMeeting === m.meetingId ? null : m.meetingId,
                        );
                      }}
                    >
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-800">{m.title}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
                          {formatMeetingLabel(m.meetingId)}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 font-medium">
                        {m.participantCount}
                      </td>
                      <td className="py-2.5 pr-3">{m.totalMinutes}</td>
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
          <h2 className="font-display text-lg font-semibold">Участници</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Кликни човек — виждаш в кои срещи е бил и колко минути.
          </p>
          {overview.allAttendees.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              Още няма записани участници с имейл. Ако си сама в срещата,
              виждаш само самата среща вляво.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-3">Човек</th>
                    <th className="py-2 pr-3">Срещи</th>
                    <th className="py-2">Общо мин.</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.allAttendees.map((a) => (
                    <tr
                      key={a.email}
                      className={cn(
                        "cursor-pointer border-b border-ink/5 hover:bg-cream/40",
                        selectedAttendee === a.email && "bg-forest-500/5",
                      )}
                      onClick={() => {
                        setSelectedMeeting(null);
                        setSelectedAttendee(
                          selectedAttendee === a.email ? null : a.email,
                        );
                      }}
                    >
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-forest-700">{a.email}</p>
                        {a.name && (
                          <p className="text-xs text-ink-soft">{a.name}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{a.meetings.length}</td>
                      <td className="py-2.5 font-medium text-forest-700">
                        {a.totalMinutes}
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
        <MeetingParticipantsPanel
          summary={selectedSummary}
          participants={meetingParticipants}
          hostOnlyMinutes={
            meetingSessions.find((s) => !s.email)?.durationMinutes ?? 0
          }
        />
      )}

      {selectedPerson && (
        <AttendeeMeetingsPanel attendee={selectedPerson} />
      )}
    </div>
  );
}

function MeetingParticipantsPanel({
  summary,
  participants,
  hostOnlyMinutes,
}: {
  summary: ZoomOverview["meetings"][number];
  participants: ZoomMeetingParticipant[];
  hostOnlyMinutes: number;
}) {
  return (
    <section className="rounded-2xl border border-forest-500/20 bg-forest-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{summary.title}</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {formatDate(summary.lastAt, "bg")}
            {hostOnlyMinutes > 0 && participants.length === 0
              ? ` · продължителност ${hostOnlyMinutes} мин.`
              : ""}
          </p>
        </div>
        <Link
          href={`/admin/contacts?meeting=${encodeURIComponent(summary.meetingId)}`}
          className="rounded-lg bg-forest-600 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          Контакти от срещата
        </Link>
      </div>

      {participants.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Няма други участници с имейл на тази среща.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Участник</th>
                <th className="py-2 pr-3">Влизания</th>
                <th className="py-2">Минути в тази среща</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={p.email} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3 text-ink-soft">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    {p.contactId ? (
                      <Link
                        href={`/admin/contacts/${p.contactId}`}
                        className="font-medium text-forest-700 hover:underline"
                      >
                        {p.email}
                      </Link>
                    ) : (
                      <span className="font-medium">{p.email}</span>
                    )}
                    {p.name && (
                      <p className="text-xs text-ink-soft">{p.name}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{p.visits}</td>
                  <td className="py-2.5 font-semibold text-forest-700">
                    {p.totalMinutes} мин.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AttendeeMeetingsPanel({ attendee }: { attendee: ZoomAttendeeSummary }) {
  return (
    <section className="rounded-2xl border border-forest-500/20 bg-forest-500/5 p-5">
      <h2 className="font-display text-lg font-semibold">
        {attendee.name || attendee.email}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Общо <strong>{attendee.totalMinutes} мин.</strong> в{" "}
        <strong>{attendee.meetings.length}</strong> срещи
      </p>
      {attendee.contactId && (
        <Link
          href={`/admin/contacts/${attendee.contactId}`}
          className="mt-2 inline-block text-sm font-medium text-forest-700 hover:underline"
        >
          Отвори профила в контакти →
        </Link>
      )}

      {attendee.meetings.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Няма записани срещи.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="py-2 pr-3">Среща</th>
                <th className="py-2 pr-3">Дата</th>
                <th className="py-2">Минути</th>
              </tr>
            </thead>
            <tbody>
              {attendee.meetings.map((m) => (
                <tr key={m.meetingId} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{m.title}</p>
                    <p className="font-mono text-[10px] text-ink-soft">
                      {formatMeetingLabel(m.meetingId)}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-ink-soft">
                    {formatDate(m.lastAt, "bg")}
                  </td>
                  <td className="py-2.5 font-semibold text-forest-700">
                    {m.minutes} мин.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
