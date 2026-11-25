"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import { Navbar } from "@/components/site/navbar";
import { useZoomLive } from "@/components/site/use-zoom-live";
import {
  BlackFridayBar,
  TOP_BAR_PX,
  useBlackFridayBarVisible,
  type BlackFridayBarCopy,
  type BlackFridayBarData,
} from "@/components/site/black-friday-bar";
import { cn } from "@/lib/utils";

/** Header offset and spacer for 0, 1 or 2 pinned bars (`h-10` each) above it. */
const NAV_TOP = ["", "top-10", "top-20"] as const;
const NAV_SPACER = ["", "h-24 sm:h-[6.5rem]", "h-[8.5rem] sm:h-36"] as const;

export function SiteHeader({
  locale,
  items,
  cta,
  blackFriday,
}: {
  locale: Locale;
  items: NavItem[];
  cta: string;
  /** Present while the campaign runs; the bar then stays pinned above the menu. */
  blackFriday?: { data: BlackFridayBarData; copy: BlackFridayBarCopy } | null;
}) {
  const live = useZoomLive(locale);
  const showLive = Boolean(live?.isLive && live.joinUrl);
  const showBlackFriday = useBlackFridayBarVisible(blackFriday?.data ?? null);
  const bars = (showLive ? 1 : 0) + (showBlackFriday ? 1 : 0);

  // Anchor jumps (CSS scroll-padding and HashScroll) clear the bars too.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--site-top-bars", `${bars * TOP_BAR_PX}px`);
    return () => {
      root.style.removeProperty("--site-top-bars");
    };
  }, [bars]);

  return (
    <>
      {showLive && live?.joinUrl ? (
        <div className="fixed inset-x-0 top-0 z-[60] h-10 border-b border-red-700/20 bg-gradient-to-r from-red-600 to-coral-500 text-white shadow-md">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-center gap-3 px-4 sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              </span>
              <Radio className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
              <span className="truncate uppercase tracking-wide">
                {locale === "bg" ? "На живо" : "Live"}
                {live.topic ? ` · ${live.topic}` : ""}
              </span>
            </div>
            <Link
              href={live.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-white px-4 py-1 text-sm font-bold text-red-600 shadow-sm transition hover:bg-cream"
            >
              {live.label}
            </Link>
          </div>
        </div>
      ) : null}

      {showBlackFriday && blackFriday ? (
        <BlackFridayBar
          data={blackFriday.data}
          copy={blackFriday.copy}
          className={showLive ? "top-10" : "top-0"}
        />
      ) : null}

      <Navbar
        locale={locale}
        items={items}
        cta={cta}
        className={cn(NAV_TOP[bars])}
        spacerClassName={cn(NAV_SPACER[bars])}
      />
    </>
  );
}
