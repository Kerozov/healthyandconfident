/** Report windows. Client-safe — the period filter runs in the browser. */

/** `0` means all time. */
export const STATS_PERIODS = [7, 30, 90, 365, 0] as const;

export type StatsPeriod = (typeof STATS_PERIODS)[number];

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  7: "7 дни",
  30: "30 дни",
  90: "90 дни",
  365: "12 месеца",
  0: "Всичко",
};

export function parseStatsPeriod(value: string | undefined | null): StatsPeriod {
  const n = Number(value);
  return (STATS_PERIODS as readonly number[]).includes(n) ? (n as StatsPeriod) : 30;
}
