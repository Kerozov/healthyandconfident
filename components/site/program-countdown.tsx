"use client";

import { useEffect, useState } from "react";

function getSundayEnd(): Date {
  const now = new Date();
  const end = new Date(now);
  const day = now.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  end.setDate(now.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() <= now.getTime()) {
    end.setDate(end.getDate() + 7);
  }
  return end;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function ProgramCountdown({ labels }: { labels: [string, string, string, string] }) {
  const [parts, setParts] = useState({ d: "00", h: "00", m: "00", s: "00" });

  useEffect(() => {
    const tick = () => {
      const diff = getSundayEnd().getTime() - Date.now();
      if (diff <= 0) {
        setParts({ d: "00", h: "00", m: "00", s: "00" });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setParts({
        d: pad(d),
        h: pad(h),
        m: pad(m),
        s: pad(s),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const units = [
    { value: parts.d, label: labels[0] },
    { value: parts.h, label: labels[1] },
    { value: parts.m, label: labels[2] },
    { value: parts.s, label: labels[3] },
  ];

  return (
    <div className="flex justify-center gap-3 sm:gap-4">
      {units.map((u) => (
        <div key={u.label} className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-900 font-display text-2xl font-bold text-white shadow-lg sm:h-20 sm:w-20 sm:text-3xl">
            {u.value}
          </div>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-forest-600">
            {u.label}
          </p>
        </div>
      ))}
    </div>
  );
}
