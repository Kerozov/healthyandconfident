"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What the layout hands the bar. Only these fields: the campaign row also
 * holds the secret early-access key, which must not reach the browser.
 */
export type BlackFridayBarData = {
  text: string;
  href: string;
  /** Public start. Before it the bar counts down to the start. */
  startsAt: string | null;
  /** End of the offers. The bar goes away then, even on a page cached earlier. */
  endsAt: string | null;
};

export type BlackFridayBarCopy = {
  cta: string;
  endsIn: string;
  startsIn: string;
  /** Short days, hours, minutes, seconds. */
  units: [string, string, string, string];
};

/** Every bar pinned above the header is `h-10`; the header moves down by this much per bar. */
export const TOP_BAR_PX = 40;

/** Payment, forms and unsubscribe: a link away from them only gets in the way. */
const HIDDEN_PATH = /^\/(?:bg|en)\/(?:checkout|forms|unsubscribe)(?:\/|$)/;

function instant(value: string | null): number {
  return value ? Date.parse(value) : NaN;
}

/** Whether the bar shows on this page right now. */
export function useBlackFridayBarVisible(data: BlackFridayBarData | null): boolean {
  const pathname = usePathname();
  const [ended, setEnded] = useState(false);
  const end = data ? instant(data.endsAt) : NaN;

  useEffect(() => {
    if (!Number.isFinite(end)) return;
    const left = Math.max(0, end - Date.now());
    // setTimeout caps at ~24.8 days; longer waits are re-checked on the next load.
    if (left > 2_147_000_000) return;
    const timer = window.setTimeout(() => setEnded(true), left);
    return () => window.clearTimeout(timer);
  }, [end]);

  if (!data || ended) return false;
  return !HIDDEN_PATH.test(pathname ?? "");
}

/** Ticks once a second. `null` until mounted, so the server and the first paint agree. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  return now;
}

function formatLeft(ms: number, units: BlackFridayBarCopy["units"]): string {
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = [
    `${pad(Math.floor(total / 3600) % 24)}${units[1]}`,
    `${pad(Math.floor(total / 60) % 60)}${units[2]}`,
    `${pad(total % 60)}${units[3]}`,
  ].join(" ");
  return days > 0 ? `${days}${units[0]} ${clock}` : clock;
}

/**
 * Black Friday reminder pinned to the very top of every site page for the
 * whole campaign: the offer, a countdown and a button to the offers. It does
 * not close; the header sits right under it. Ten seconds in, it drops a little
 * and bounces back once (`animate-bf-bar-drop` in globals.css).
 */
export function BlackFridayBar({
  data,
  copy,
  className,
}: {
  data: BlackFridayBarData;
  copy: BlackFridayBarCopy;
  className?: string;
}) {
  const pathname = usePathname();
  const now = useNow();

  const start = instant(data.startsAt);
  const early = now !== null && Number.isFinite(start) && now < start;
  const target = early ? start : instant(data.endsAt);
  const left = now !== null && Number.isFinite(target) ? Math.max(0, target - now) : null;
  const onOffersPage = pathname === data.href;

  const content = (
    <>
      {/* Two short lines on a phone, so the discount is not cut off; one line from `sm`. */}
      <span className="line-clamp-2 min-w-0 text-xs leading-tight sm:line-clamp-1 sm:text-sm">
        {data.text}
      </span>
      {left !== null && (
        <span className="hidden shrink-0 font-medium text-white/70 md:inline" aria-hidden>
          {early ? copy.startsIn : copy.endsIn}{" "}
          <span className="font-semibold tabular-nums text-gold-400">
            {formatLeft(left, copy.units)}
          </span>
        </span>
      )}
      {!onOffersPage && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-forest-900 transition-colors group-hover:bg-gold-500 sm:px-4 sm:text-[13px]">
          {copy.cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </>
  );

  const inner =
    "mx-auto flex h-full max-w-7xl items-center justify-center gap-3 px-4 text-[13px] font-semibold sm:px-6 sm:text-sm";

  return (
    <div
      className={cn(
        "animate-bf-bar-drop fixed inset-x-0 z-[55] h-10 border-b border-white/10 bg-forest-900 text-white",
        className,
      )}
    >
      {onOffersPage ? (
        <div className={inner}>{content}</div>
      ) : (
        <Link href={data.href} className={cn(inner, "group")}>
          {content}
        </Link>
      )}
    </div>
  );
}
