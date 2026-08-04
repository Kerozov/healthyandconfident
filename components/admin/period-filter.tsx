"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { STATS_PERIODS, STATS_PERIOD_LABELS } from "@/lib/admin/stats-periods";
import type { StatsPeriod } from "@/lib/admin/stats-periods";
import { cn } from "@/lib/utils";

/**
 * One filter row above everything it scopes — every card, chart and table on the
 * page re-renders against the same window, so the numbers always agree.
 */
export function PeriodFilter({ active }: { active: StatsPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(period: StatsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", String(period));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div
      role="group"
      aria-label="Период"
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1 transition-opacity",
        pending && "opacity-60",
      )}
    >
      {STATS_PERIODS.map((period) => {
        const selected = period === active;
        return (
          <button
            key={period}
            type="button"
            onClick={() => select(period)}
            aria-pressed={selected}
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35",
              selected
                ? "bg-forest-600 text-cream"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            {STATS_PERIOD_LABELS[period]}
          </button>
        );
      })}
    </div>
  );
}
