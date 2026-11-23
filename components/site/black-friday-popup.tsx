"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { BlackFridayPopupData } from "@/lib/black-friday/popup-types";
import { ModalCloseButton } from "@/components/site/modal-close-button";
import { isCtaPreviewPage } from "@/lib/site/cta-preview";
import { releaseAutoPopup, reserveAutoPopup, takeAutoPopup } from "@/lib/site/auto-popup-slot";

export type BlackFridayPopupCopy = {
  eyebrow: string;
  title: string;
  text: string;
  countdownLabel: string;
  cta: string;
  dismiss: string;
  close: string;
  /** Days, hours, minutes, seconds. */
  units: [string, string, string, string];
};

const SLOT = "black-friday";
const STORAGE_KEY = "hc_bf_popup";
/** Opens after this long on a page, or earlier once the reader scrolls a third of it. */
const OPEN_AFTER_MS = 5000;
const OPEN_AT_SCROLL = 0.3;
/** „Не сега“ hides it for a day; going to the offers hides it until the end. */
const SNOOZE_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 4000;

/** The offers themselves, payment and forms: a popup there would only get in the way. */
const SKIP_PATH = /^\/(?:bg|en)\/(?:black-friday|checkout|forms|unsubscribe)(?:\/|$)/;

function hiddenUntil(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function hideUntil(ms: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ms));
  } catch {
    // Private mode: it simply shows again on the next visit.
  }
}

function Countdown({
  deadline,
  label,
  units,
  onEnd,
}: {
  deadline: number;
  label: string;
  units: BlackFridayPopupCopy["units"];
  onEnd: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, deadline - Date.now());
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(timer);
        onEnd();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, onEnd]);

  const seconds = Math.ceil(remaining / 1000);
  const parts = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];

  return (
    <div role="timer" aria-label={label} className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">{label}</p>
      <dl className="mt-2 flex justify-center gap-2">
        {parts.map((value, index) => (
          <div
            key={units[index]}
            className="flex min-w-[3.75rem] flex-col-reverse items-center rounded-xl bg-white/10 px-2 py-1.5"
          >
            <dt className="text-[10px] font-medium uppercase tracking-wide text-white/60">
              {units[index]}
            </dt>
            <dd className="font-display text-2xl font-semibold tabular-nums">
              {String(value).padStart(2, "0")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Black Friday offer that pops up on every site page (blog included) while
 * the campaign is live. It asks the server whether the offers are open, so a
 * cached page cannot show it before the start or after the end.
 */
export function BlackFridayPopup({
  locale,
  href,
  copy,
}: {
  locale: Locale;
  href: string;
  copy: BlackFridayPopupCopy;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<BlackFridayPopupData | null>(null);
  const [open, setOpen] = useState(false);
  // Shown (or ruled out) for this visit — later page changes don't retry.
  const doneRef = useRef(false);

  useEffect(() => {
    // A popup over the button preview would hide the very thing being shown.
    if (isCtaPreviewPage() || Date.now() < hiddenUntil()) {
      doneRef.current = true;
      return;
    }
    reserveAutoPopup(SLOT);
    const controller = new AbortController();
    fetch(`/api/black-friday/popup?locale=${locale}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BlackFridayPopupData>) : null))
      .then((d) => {
        if (d?.live) {
          setData(d);
        } else {
          doneRef.current = true;
          releaseAutoPopup(SLOT);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        doneRef.current = true;
        releaseAutoPopup(SLOT);
      });
    return () => controller.abort();
  }, [locale]);

  // (Re)armed on every page change until it has shown once.
  useEffect(() => {
    if (!data || doneRef.current || SKIP_PATH.test(pathname)) return;

    let timer = 0;
    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
    const show = () => {
      stop();
      if (doneRef.current) return;
      const end = data.deadline ? Date.parse(data.deadline) : NaN;
      if (Number.isFinite(end) && Date.now() >= end) {
        doneRef.current = true;
        releaseAutoPopup(SLOT);
        return;
      }
      // Something else is open (a form the visitor clicked): wait for it.
      if (document.querySelector('[aria-modal="true"]')) {
        timer = window.setTimeout(show, RETRY_MS);
        return;
      }
      if (!takeAutoPopup(SLOT)) {
        doneRef.current = true;
        return;
      }
      doneRef.current = true;
      setOpen(true);
    };
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= OPEN_AT_SCROLL) show();
    }

    timer = window.setTimeout(show, OPEN_AFTER_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return stop;
  }, [data, pathname]);

  const dismiss = useCallback(() => {
    hideUntil(Date.now() + SNOOZE_MS);
    setOpen(false);
  }, []);

  const deadline = data?.deadline ? Date.parse(data.deadline) : NaN;

  const goToOffers = useCallback(() => {
    hideUntil(Number.isFinite(deadline) ? deadline : Date.now() + 7 * SNOOZE_MS);
    setOpen(false);
  }, [deadline]);

  const endNow = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, dismiss]);

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-forest-900/60 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bf-popup-title"
      onClick={dismiss}
    >
      <div
        className="animate-fade-up relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream-50 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalCloseButton onClick={dismiss} label={copy.close} />

        <div className="bg-forest-900 px-5 pb-6 pt-7 text-center text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">
            {copy.eyebrow}
          </p>
          <h2
            id="bf-popup-title"
            className="mt-2 px-8 font-display text-2xl font-semibold leading-tight sm:text-3xl"
          >
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/80">
            {copy.text}
          </p>
          {Number.isFinite(deadline) && (
            <Countdown
              deadline={deadline}
              label={copy.countdownLabel}
              units={copy.units}
              onEnd={endNow}
            />
          )}
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          {data.deals.length > 0 && (
            <ul className="space-y-2.5">
              {data.deals.map((deal) => (
                <li
                  key={deal.title}
                  className="flex items-center gap-3 rounded-2xl border border-forest-100 bg-white p-3.5"
                >
                  <span className="shrink-0 rounded-full bg-gold-400 px-2.5 py-1 text-xs font-bold tabular-nums text-forest-900">
                    −{deal.savedPercent}%
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-800">
                    {deal.title}
                  </span>
                  <span className="shrink-0 text-right leading-tight">
                    <strong className="block font-display text-lg font-semibold text-slate-800">
                      {deal.price}
                    </strong>
                    <del className="text-xs text-ink-soft">{deal.was}</del>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            href={href}
            onClick={goToOffers}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-400 px-6 py-3 text-base font-bold text-forest-900 transition-colors hover:bg-gold-500"
          >
            {copy.cta} <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm text-ink-soft underline-offset-4 hover:underline"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
