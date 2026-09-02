"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { STATS_PERIODS, STATS_PERIOD_LABELS } from "@/lib/admin/stats-periods";
import type { StatsPeriod } from "@/lib/admin/stats-periods";
import { cn } from "@/lib/utils";

/**
 * Period tabs + manual refresh for analytics pages. Shows visible loading feedback
 * while the server page re-fetches stats.
 */
export function StatsToolbar({ active }: { active: StatsPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(period: StatsPeriod) {
    if (period === active) {
      startTransition(() => router.refresh());
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", String(period));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Период"
        aria-busy={pending}
        className={cn(
          "inline-flex flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1 transition-opacity",
          pending && "opacity-70",
        )}
      >
        {STATS_PERIODS.map((period) => {
          const selected = period === active;
          return (
            <button
              key={period}
              type="button"
              onClick={() => select(period)}
              disabled={pending}
              aria-pressed={selected}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 disabled:cursor-wait",
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

      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden />
        )}
        Обнови
      </button>

      {pending ? (
        <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-forest-600" aria-hidden />
          Зареждане…
        </span>
      ) : null}
    </div>
  );
}
