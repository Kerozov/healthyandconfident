/** How a big manual send is spread out. Client-safe. */
export const SEND_PACING_OPTIONS = [
  { minutes: 0, label: "Наведнъж" },
  { minutes: 1, label: "По 1 на минута" },
  { minutes: 3, label: "По 1 на 3 минути" },
  { minutes: 10, label: "По 1 на 10 минути" },
] as const;

export const DEFAULT_SEND_PACING_MINUTES = 1;

/** "~2 ч 19 мин" — how long until the last one goes out. */
export function pacingDurationLabel(count: number, minutes: number): string | null {
  const total = Math.max(0, count - 1) * minutes;
  if (total === 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `~${h > 0 ? `${h} ч ` : ""}${m > 0 || h === 0 ? `${m} мин` : ""}`.trim();
}
