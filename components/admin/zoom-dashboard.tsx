"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Clock, Repeat, Search, Users, Video } from "lucide-react";
import { AdminNavLink } from "@/components/admin/admin-navigation";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/admin/charts";
import type {
  ZoomPerson,
  ZoomReport,
  ZoomSession,
} from "@/lib/admin/zoom-report";

const OLIVE = "#6a7153";
const CORAL = "#e2603a";

const MONTHS = [
  "яну",
  "фев",
  "мар",
  "апр",
  "май",
  "юни",
  "юли",
  "авг",
  "сеп",
  "окт",
  "ное",
  "дек",
];

function sofiaParts(iso: string) {
  const d = new Date(iso);
  const day = Number(
    d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Europe/Sofia" }),
  );
  const month = Number(
    d.toLocaleDateString("en-US", {
      month: "numeric",
      timeZone: "Europe/Sofia",
    }),
  );
  const time = d.toLocaleTimeString("bg-BG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Sofia",
  });
  return { day, month: MONTHS[month - 1] ?? "", time };
}

function shortDate(iso: string) {
  const p = sofiaParts(iso);
  return `${p.day} ${p.month}`;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function useMounted(delay = 0) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), delay + 30);
    return () => window.clearTimeout(id);
  }, [delay]);
  return mounted;
}


function Bar({
  value,
  color = OLIVE,
  height = 6,
  delay = 0,
  label,
}: {
  value: number;
  color?: string;
  height?: number;
  delay?: number;
  label?: string;
}) {
  const mounted = useMounted(delay);
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-forest-100"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{
          width: mounted ? `${pct > 0 ? Math.max(2, pct) : 0}%` : "0%",
          background: color,
        }}
      />
    </div>
  );
}

function Ring({ value, size = 46 }: { value: number; size?: number }) {
  const mounted = useMounted();
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Средно стоят ${value}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#eceee6"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={OLIVE}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={mounted ? c * (1 - value / 100) : c}
          className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-semibold text-ink">
        {value}%
      </span>
    </div>
  );
}

function Initials({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const source = (name || email || "?").trim();
  const text = source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest-600 text-[11px] font-semibold text-white"
    >
      {text || "?"}
    </span>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  index,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  index: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-fade-up rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md",
        accent
          ? "border-transparent bg-forest-700 text-white"
          : "border-ink/10 bg-white",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            accent ? "text-white/75" : "text-ink-soft/70",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl",
            accent ? "bg-white/15" : "bg-forest-100 text-forest-700",
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-semibold tabular-nums",
          accent ? "text-white" : "text-ink",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1 text-xs",
          accent ? "text-white/75" : "text-ink-soft",
        )}
      >
        {sub}
      </p>
    </div>
  );
}

export function ZoomDashboard({ report }: { report: ZoomReport }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { totals, sessions, people } = report;

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-12 text-center">
        <Video className="mx-auto h-10 w-10 text-forest-300" />
        <p className="mt-3 font-medium text-ink">
          Няма Zoom сесии в този период
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Избери по-дълъг период горе вдясно.
        </p>
      </div>
    );
  }

  const chronological = [...sessions].reverse().slice(-30);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          index={0}
          accent
          icon={<Video className="h-4 w-4" />}
          label="Проведени сесии"
          value={<CountUp value={totals.sessions} />}
          sub={`${formatMinutes(totals.totalMinutes)} общо време на хората`}
        />
        <Kpi
          index={1}
          icon={<Users className="h-4 w-4" />}
          label="Различни хора"
          value={<CountUp value={totals.uniquePeople} />}
          sub={`средно ${totals.avgAttendees.toLocaleString("bg-BG")} на сесия`}
        />
        <Kpi
          index={2}
          icon={<Repeat className="h-4 w-4" />}
          label="Връщат се"
          value={<CountUp value={totals.returningRate} suffix="%" />}
          sub={`${totals.returningPeople} души са идвали поне 2 пъти`}
        />
        <Kpi
          index={3}
          icon={<Clock className="h-4 w-4" />}
          label="Средно стоят"
          value={
            totals.avgStayPct != null ? (
              <CountUp value={totals.avgStayPct} suffix="%" />
            ) : (
              "—"
            )
          }
          sub="от продължителността на сесията"
        />
      </div>

      {chronological.length > 1 ? (
        <SessionColumns
          sessions={chronological}
          selected={selected}
          onSelect={setSelected}
        />
      ) : null}

      <AttendanceMatrix sessions={sessions} people={people} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Сесии</h2>
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
            >
              <SessionCard
                session={s}
                open={selected === s.id}
                onToggle={() => setSelected(selected === s.id ? null : s.id)}
              />
            </div>
          ))}
        </div>
        <PeopleList people={people} totalSessions={sessions.length} />
      </div>
    </div>
  );
}

function SessionColumns({
  sessions,
  selected,
  onSelect,
}: {
  sessions: ZoomSession[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const mounted = useMounted(100);
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...sessions.map((s) => s.attendees.length));
  const active = sessions.find((s) => s.id === hover);
  return (
    <section className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold">
        Хора на всяка сесия
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        Натисни колона, за да отвориш сесията отдолу.
      </p>
      <div className="relative mt-5">
        <div className="flex h-44 items-end gap-1.5">
          {sessions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                requestAnimationFrame(() =>
                  document
                    .getElementById(`zoom-session-${s.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                );
              }}
              onPointerEnter={() => setHover(s.id)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(s.id)}
              onBlur={() => setHover(null)}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              aria-label={`${shortDate(s.startedAt)}: ${s.attendees.length} души`}
            >
              <span className="mb-1 text-[10px] font-semibold tabular-nums text-ink-soft opacity-0 transition group-hover:opacity-100">
                {s.attendees.length}
              </span>
              <span
                className="w-full max-w-9 rounded-t-md transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none"
                style={{
                  height: mounted ? `${(s.attendees.length / max) * 85}%` : 0,
                  transitionDelay: `${i * 25}ms`,
                  background: OLIVE,
                  opacity: selected && selected !== s.id ? 0.35 : 1,
                }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-ink-soft/70">
          <span>{shortDate(sessions[0].startedAt)}</span>
          <span>{shortDate(sessions[sessions.length - 1].startedAt)}</span>
        </div>
        {active ? (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs shadow-md">
            <strong>{shortDate(active.startedAt)}</strong> ·{" "}
            {active.attendees.length} души · {active.topic}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Хора × последните 16 сесии: кой на коя е бил. */
function AttendanceMatrix({
  sessions,
  people,
}: {
  sessions: ZoomSession[];
  people: ZoomPerson[];
}) {
  const [showAll, setShowAll] = useState(false);
  const cols = useMemo(() => [...sessions].slice(0, 16).reverse(), [sessions]);
  const byPerson = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>();
    for (const s of cols) {
      for (const a of s.attendees) {
        const m = map.get(a.personKey) ?? new Map<string, number | null>();
        m.set(s.id, a.stayPct);
        map.set(a.personKey, m);
      }
    }
    return map;
  }, [cols]);
  const rows = people.filter((p) => byPerson.has(p.key));
  if (cols.length < 2 || rows.length === 0) return null;
  const visible = showAll ? rows : rows.slice(0, 15);

  return (
    <section className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold">
        Кой на коя сесия е бил
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        Последните {cols.length} сесии · по-плътен кръг = стоял по-дълго.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white pr-4 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
                Човек
              </th>
              {cols.map((s) => (
                <th
                  key={s.id}
                  className="px-1 text-center text-[10px] font-normal text-ink-soft/70"
                  title={s.topic}
                >
                  {shortDate(s.startedAt)}
                </th>
              ))}
              <th className="pl-4 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
                Общо
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const m = byPerson.get(p.key)!;
              return (
                <tr key={p.key}>
                  <td
                    className="sticky left-0 z-10 max-w-52 truncate bg-white pr-4 font-medium text-ink"
                    title={p.email ?? undefined}
                  >
                    {p.name || p.email}
                  </td>
                  {cols.map((s) => {
                    const here = m.has(s.id);
                    const stay = m.get(s.id);
                    return (
                      <td key={s.id} className="px-1 text-center">
                        <span
                          className="mx-auto block h-5 w-5 rounded-full transition-transform hover:scale-125"
                          title={
                            here
                              ? `${shortDate(s.startedAt)}: ${stay != null ? `${stay}% от сесията` : "присъства"}`
                              : `${shortDate(s.startedAt)}: не е бил`
                          }
                          style={
                            here
                              ? {
                                  background: OLIVE,
                                  opacity:
                                    stay != null
                                      ? 0.35 + (stay / 100) * 0.65
                                      : 1,
                                }
                              : { boxShadow: "inset 0 0 0 1.5px #dde1d2" }
                          }
                        />
                      </td>
                    );
                  })}
                  <td className="pl-4 text-right tabular-nums text-ink-soft">
                    {m.size}/{cols.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 15 ? (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs font-semibold text-coral-600 hover:underline"
        >
          {showAll ? "Покажи по-малко" : `Покажи всички ${rows.length}`}
        </button>
      ) : null}
    </section>
  );
}

function SessionCard({
  session: s,
  open,
  onToggle,
}: {
  session: ZoomSession;
  open: boolean;
  onToggle: () => void;
}) {
  const start = sofiaParts(s.startedAt);
  const end = sofiaParts(s.endedAt);
  return (
    <div
      id={`zoom-session-${s.id}`}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-2xl border bg-white transition",
        open
          ? "border-forest-500/40 shadow-md"
          : "border-ink/10 hover:border-forest-500/30",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest-100 text-center leading-tight text-forest-700">
          <span className="text-[10px] uppercase">{start.month}</span>
          <span className="text-lg font-semibold">{start.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{s.topic}</p>
          <p className="text-xs text-ink-soft">
            {start.time}–{end.time} · {formatMinutes(s.durationMinutes)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-semibold tabular-nums text-ink">
            {s.attendees.length}
          </p>
          <p className="text-[11px] text-ink-soft">души</p>
        </div>
        {s.avgStayPct != null ? <Ring value={s.avgStayPct} /> : null}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-forest-600 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="animate-fade-up border-t border-ink/5 bg-cream/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-soft">
              Средно {formatMinutes(s.avgMinutes)} на човек. Лентата е каква
              част от сесията е стоял.
            </p>
            <AdminNavLink
              href={`/admin/contacts?meeting=${encodeURIComponent(s.meetingId)}`}
              showSpinner={false}
              className="rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-700"
            >
              Контакти от срещата
            </AdminNavLink>
          </div>
          <ul className="space-y-2.5">
            {s.attendees.map((a, i) => (
              <li key={a.personKey} className="flex items-center gap-3">
                <Initials name={a.name} email={a.email} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    {a.contactId ? (
                      <AdminNavLink
                        href={`/admin/contacts/${a.contactId}`}
                        showSpinner={false}
                        className="truncate text-sm font-medium text-forest-700 hover:underline"
                      >
                        {a.name || a.email}
                      </AdminNavLink>
                    ) : (
                      <p className="truncate text-sm font-medium text-ink">
                        {a.name || a.email || "Без име"}
                      </p>
                    )}
                    <p className="shrink-0 text-xs tabular-nums text-ink-soft">
                      {formatMinutes(a.minutes)}
                      {a.stayPct != null ? ` · ${a.stayPct}%` : ""}
                    </p>
                  </div>
                  <Bar
                    value={a.stayPct ?? 0}
                    delay={i * 40}
                    label={`${a.stayPct ?? 0}% от сесията`}
                  />
                  <p className="mt-0.5 truncate text-[11px] text-ink-soft/70">
                    {a.email ?? "влязъл без имейл"}
                    {a.joins > 1 ? ` · влизал ${a.joins} пъти` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PeopleList({
  people,
  totalSessions,
}: {
  people: ZoomPerson[];
  totalSessions: number;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(25);
  const q = query.trim().toLowerCase();
  const list = people.filter(
    (p) =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").includes(q),
  );

  return (
    <section className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold">
        Хора през всички сесии
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        Присъствие = на колко от сесиите след първото си идване е бил (
        {totalSessions} сесии в периода).
      </p>
      <label className="relative mt-4 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Търси човек…"
          className="w-full rounded-xl border border-ink/15 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20"
        />
      </label>
      <ul className="mt-4 space-y-3">
        {list.slice(0, limit).map((p, i) => (
          <li key={p.key} className="flex items-center gap-3">
            <Initials name={p.name} email={p.email} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                {p.contactId ? (
                  <AdminNavLink
                    href={`/admin/contacts/${p.contactId}`}
                    showSpinner={false}
                    className="truncate text-sm font-medium text-forest-700 hover:underline"
                  >
                    {p.name || p.email}
                  </AdminNavLink>
                ) : (
                  <p className="truncate text-sm font-medium text-ink">
                    {p.name || p.email}
                  </p>
                )}
                <p className="shrink-0 text-xs tabular-nums text-ink-soft">
                  {p.sessions} {p.sessions === 1 ? "сесия" : "сесии"} ·{" "}
                  {formatMinutes(p.totalMinutes)}
                </p>
              </div>
              <Bar
                value={p.attendanceRate}
                color={CORAL}
                delay={i * 30}
                label={`Присъствие ${p.attendanceRate}%`}
              />
              <p className="mt-0.5 truncate text-[11px] text-ink-soft/70">
                {p.attendanceRate}% присъствие
                {p.avgStayPct != null
                  ? ` · стои средно ${p.avgStayPct}%`
                  : ""}{" "}
                · последно {shortDate(p.lastSeenAt)}
                {p.email ? "" : " · без имейл"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {list.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit(limit + 50)}
          className="mt-3 text-xs font-semibold text-coral-600 hover:underline"
        >
          Покажи още ({list.length - limit})
        </button>
      ) : null}
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Никой не съвпада.</p>
      ) : null}
    </section>
  );
}
