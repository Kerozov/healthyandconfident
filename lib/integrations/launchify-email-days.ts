/** Без IO: дните на доклада към Launchify. */

const DAY_MS = 86_400_000;

/** Денят в София (ГГГГ-ММ-ДД). */
export function sofiaDay(at: Date): string {
  return at.toLocaleDateString("en-CA", { timeZone: "Europe/Sofia" });
}

/** Първият ден на миналия месец — докладът покрива и прехода между месеците. */
export function previousMonthStart(day: string): string {
  const [y, m] = day.split("-").map(Number);
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Всеки ден от `from` до `to`, с нула където не е пратено нищо — нулата казва
 * на Launchify да махне деня, ако всичко в него е отказано.
 */
export function emailDaysSince(
  from: string,
  to: string,
  rows: Array<{ day: string; emails: number | string }>,
): Array<{ day: string; emails: number }> {
  const counts = new Map(
    rows.map((r) => [String(r.day).slice(0, 10), Number(r.emails) || 0]),
  );
  const out: Array<{ day: string; emails: number }> = [];
  for (
    let t = Date.parse(`${from}T00:00:00Z`);
    t <= Date.parse(`${to}T00:00:00Z`);
    t += DAY_MS
  ) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push({ day, emails: counts.get(day) ?? 0 });
  }
  return out;
}
