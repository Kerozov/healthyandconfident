import { buildZoomReport, type ZoomEventRow } from "@/lib/admin/zoom-report";

let failures = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

let n = 0;
function row(p: Partial<ZoomEventRow> & { leftAt: string }): ZoomEventRow {
  n += 1;
  return {
    id: `r${n}`,
    contactId: null,
    meetingId: "999",
    email: null,
    name: null,
    joinedAt: null,
    durationMinutes: 0,
    zoomEvent: "meeting.participant_left",
    ...p,
  };
}

// Една и съща повтаряща се среща (едно Meeting ID) две поредни седмици.
const rows: ZoomEventRow[] = [
  row({
    zoomEvent: "meeting.ended",
    name: "Сряда на живо",
    joinedAt: "2026-10-01T17:00:00Z",
    leftAt: "2026-10-01T18:00:00Z",
    durationMinutes: 60,
  }),
  // Мария пада и се връща.
  row({
    email: "maria@x.bg",
    name: "Мария",
    joinedAt: "2026-10-01T17:00:00Z",
    leftAt: "2026-10-01T17:20:00Z",
    durationMinutes: 20,
  }),
  row({
    email: "maria@x.bg",
    name: "Мария",
    joinedAt: "2026-10-01T17:25:00Z",
    leftAt: "2026-10-01T18:00:00Z",
    durationMinutes: 35,
  }),
  // Иван без имейл.
  row({
    name: "Иван",
    joinedAt: "2026-10-01T17:10:00Z",
    leftAt: "2026-10-01T17:40:00Z",
    durationMinutes: 30,
  }),
  // Втора седмица — без ред „среща приключи“; Мария влиза без имейл със същото име.
  row({
    name: "мария",
    joinedAt: "2026-10-08T17:00:00Z",
    leftAt: "2026-10-08T17:30:00Z",
    durationMinutes: 30,
  }),
  row({
    name: "Петя",
    joinedAt: "2026-10-08T17:05:00Z",
    leftAt: "2026-10-08T18:00:00Z",
    durationMinutes: 55,
  }),
];

const report = buildZoomReport(rows);

console.log("zoom report");
check(
  "повтарящата се среща е две сесии, не една",
  report.sessions.length === 2,
  report.sessions.length,
);
const first = report.sessions.find((s) => s.startedAt.startsWith("2026-10-01"));
check(
  "темата идва от реда за срещата",
  first?.topic === "Сряда на живо",
  first?.topic,
);
const maria = first?.attendees.find((a) => a.email === "maria@x.bg");
check("повторно влизане се слива: 55 мин", maria?.minutes === 55, maria);
check("стоял 92% от срещата", maria?.stayPct === 92, maria?.stayPct);
check(
  "хората без имейл се броят",
  Boolean(first?.attendees.find((a) => a.name === "Иван")),
);
const mariaPerson = report.people.find((p) => p.email === "maria@x.bg");
check(
  "Мария е един човек на две сесии",
  mariaPerson?.sessions === 2,
  mariaPerson,
);
check(
  "различни хора = 3",
  report.totals.uniquePeople === 3,
  report.totals.uniquePeople,
);
check(
  "връщащи се = 1",
  report.totals.returningPeople === 1,
  report.totals.returningPeople,
);
const ivan = report.people.find((p) => p.name === "Иван");
check(
  "Иван: 1 от 2 сесии = 50%",
  ivan?.attendanceRate === 50,
  ivan?.attendanceRate,
);

if (failures > 0) {
  console.log(`\n${failures} failed`);
  process.exit(1);
}
console.log("\nall good");
