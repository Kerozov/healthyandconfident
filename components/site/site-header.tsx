"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { NavItem } from "@/i18n/types";
import { Navbar } from "@/components/site/navbar";
import { useZoomLive } from "@/components/site/use-zoom-live";
import { cn } from "@/lib/utils";

export function SiteHeader({
  locale,
  items,
  cta,
}: {
  locale: Locale;
  items: NavItem[];
  cta: string;
}) {
  const live = useZoomLive(locale);
  const showLive = Boolean(live?.isLive && live.joinUrl);

  return (
    <>
      {showLive && live?.joinUrl ? (
        <div className="fixed inset-x-0 top-0 z-[60] border-b border-red-700/20 bg-gradient-to-r from-red-600 to-coral-500 text-white shadow-md">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 sm:justify-between sm:px-6">
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
              className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-cream"
            >
              {live.label}
            </Link>
          </div>
        </div>
      ) : null}

      <Navbar
        locale={locale}
        items={items}
        cta={cta}
        className={cn(showLive && "top-10 sm:top-10")}
        spacerClassName={cn(showLive && "h-[5.5rem] sm:h-[6rem]")}
      />
    </>
  );
}
