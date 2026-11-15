"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Days, hours, minutes and seconds to the end of the offers. At zero the page
 * is refreshed, so the server swaps the offers for the „campaign ended“ note.
 */
export function BlackFridayCountdown({
  deadline,
  now,
  label,
  units,
}: {
  deadline: number;
  /** Server time at render, so the first paint matches the HTML. */
  now: number;
  label: string;
  units: [string, string, string, string];
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - now));

  useEffect(() => {
    let done = false;
    const tick = () => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (next === 0 && !done) {
        done = true;
        window.clearInterval(timer);
        router.refresh();
      }
    };
    const timer = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(timer);
  }, [deadline, router]);

  const seconds = Math.ceil(remaining / 1000);
  const parts = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];

  return (
    <div role="timer" aria-label={label} className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</p>
      <dl className="flex gap-2 sm:gap-3">
        {parts.map((value, index) => (
          <div
            key={units[index]}
            className="flex min-w-16 flex-col-reverse items-center rounded-2xl bg-white/10 px-3 py-2.5 sm:min-w-20"
          >
            <dt className="text-[11px] font-medium uppercase tracking-wide text-white/70">
              {units[index]}
            </dt>
            <dd className="font-display text-3xl font-semibold tabular-nums text-white sm:text-4xl">
              {String(value).padStart(2, "0")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
