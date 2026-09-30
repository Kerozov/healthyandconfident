"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Sections that already show the offer — the bar steps aside while they are on screen. */
const OFFER_SECTION_IDS = ["programs", "guides", "contact"];

/**
 * Phones only: once the hero's buttons have scrolled away, the way to the
 * programmes stays one thumb-tap away at the bottom of the screen.
 */
export function StickyCta({
  locale,
  label,
  leaveRoomForChat,
}: {
  locale: Locale;
  label: string;
  /** The Messenger bubble sits bottom-right; keep clear of it. */
  leaveRoomForChat: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScreen = new Set<Element>();
    let pastHero = false;
    const update = () => setVisible(pastHero && onScreen.size === 0);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      update();
    });
    for (const id of OFFER_SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.9;
      update();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-6 z-40 px-4 transition-all duration-300 lg:hidden",
        leaveRoomForChat && "pr-24",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      <Link
        href={`/${locale}#programs`}
        tabIndex={visible ? undefined : -1}
        aria-hidden={visible ? undefined : true}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-800 px-6 text-base font-semibold text-white shadow-xl shadow-slate-900/25 transition-colors hover:bg-slate-700"
      >
        {label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
