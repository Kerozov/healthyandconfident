/** Admin campaign scheduling — wall clock in Europe/Sofia → UTC ISO. */
export const SCHEDULE_TIMEZONE = "Europe/Sofia";

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function hasTimezoneOffset(value: string): boolean {
  return /[zZ]$/.test(value) || /[+-]\d{2}:\d{2}$/.test(value);
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts: Record<string, number> = {};
  for (const p of formatter.formatToParts(date)) {
    if (p.type === "literal") continue;
    const n = Number(p.value);
    parts[p.type] = p.type === "hour" && n === 24 ? 0 : n;
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Convert wall-clock in a timezone to a UTC Date. */
function wallClockInTimeZoneToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desired;

  for (let i = 0; i < 4; i++) {
    const shown = getZonedParts(new Date(guess), timeZone);
    const shownAsUtc = Date.UTC(
      shown.year,
      shown.month - 1,
      shown.day,
      shown.hour,
      shown.minute,
      shown.second,
    );
    const diff = shownAsUtc - desired;
    if (diff === 0) break;
    guess -= diff;
  }

  return new Date(guess);
}

/**
 * Parse schedule input to UTC ISO.
 * - `datetime-local` (no offset) → Europe/Sofia wall clock
 * - ISO with Z/offset → as given
 */
export function parseScheduledAt(
  value: string,
  timeZone = SCHEDULE_TIMEZONE,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (hasTimezoneOffset(trimmed)) {
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
  }

  const match = trimmed.match(DATETIME_LOCAL_RE);
  if (match) {
    const utc = wallClockInTimeZoneToUtc(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] ?? "0"),
      timeZone,
    );
    return utc.toISOString();
  }

  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Client: datetime-local → UTC ISO (browser local time). */
export function datetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = new Date(trimmed).getTime();
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function formatScheduledAt(
  date: string | Date,
  locale: string,
  timeZone = SCHEDULE_TIMEZONE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "bg" ? "bg-BG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(d);
}
