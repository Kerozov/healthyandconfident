"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Every in-page jump goes through here, so a second click on the same link
 * always scrolls again. Browsers (and the Next.js router) skip the jump when the
 * URL already carries that hash, which used to leave the button dead after the
 * visitor scrolled away. The hash is wiped from the address bar right after the
 * scroll starts, so the URL never claims we are parked on a section.
 */

/** Fallback when the section carries no `scroll-mt-*` — roughly the header height. */
const HEADER_OFFSET = 88;

/** Photos further up finish loading mid-scroll and shift everything; re-aim. */
const SETTLE_TIMEOUT_MS = 1600;
const DRIFT_TOLERANCE_PX = 4;

function targetOffset(target: HTMLElement): number {
  // Sections declare their own clearance with `scroll-mt-24`; honour it.
  const declared = parseFloat(getComputedStyle(target).scrollMarginTop);
  return Number.isFinite(declared) && declared > 0 ? declared : HEADER_OFFSET;
}

function scrollToElement(target: HTMLElement, smooth: boolean) {
  const top = target.getBoundingClientRect().top + window.scrollY - targetOffset(target);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: smooth && !reduceMotion ? "smooth" : "auto",
  });
}

/**
 * Scrolls to the section, then keeps an eye on it: once the page stops moving,
 * any drift caused by images loading above is corrected. A manual scroll cancels
 * the watcher, so the visitor is never yanked around.
 */
function scrollToId(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;

  scrollToElement(target, true);

  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  let lastY = window.scrollY;
  let stableTicks = 0;
  let timer = 0;

  const stop = () => {
    window.clearInterval(timer);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };

  timer = window.setInterval(() => {
    if (Date.now() > deadline) {
      stop();
      return;
    }
    const y = window.scrollY;
    stableTicks = y === lastY ? stableTicks + 1 : 0;
    lastY = y;
    if (stableTicks < 2) return;

    stop();
    const drift = target.getBoundingClientRect().top - targetOffset(target);
    if (Math.abs(drift) > DRIFT_TOLERANCE_PX) scrollToElement(target, false);
  }, 100);

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);

  return true;
}

/** Drops `#section` from the address bar without touching scroll position. */
function stripHash() {
  if (!window.location.hash) return;
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + window.location.search,
  );
}

/**
 * Waits a couple of frames before scrolling: the mobile menu locks
 * `body { overflow: hidden }` while it is open, and scrolling only works once
 * React has closed it and released the lock.
 */
function scrollSoon(id: string) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToId(id));
  });
}

export function HashScroll() {
  const pathname = usePathname();

  // Arriving at /bg#contact — first load or a link from another page — still has
  // to scroll once, and the section may not be painted yet, hence the retries.
  useEffect(() => {
    const target = decodeURIComponent(window.location.hash.slice(1));
    if (!target) return;

    let attempts = 0;
    let frame = 0;
    const tryScroll = () => {
      if (scrollToId(target) || attempts > 20) {
        stripHash();
        return;
      }
      attempts += 1;
      frame = requestAnimationFrame(tryScroll);
    };
    frame = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const raw = anchor.getAttribute("href");
      if (!raw || !raw.includes("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== window.location.pathname) return;

      const id = decodeURIComponent(url.hash.slice(1));
      if (!id || !document.getElementById(id)) return;

      event.preventDefault();
      stripHash();
      scrollSoon(id);
    }

    // Capture phase: the router's own click handler would otherwise navigate
    // first, leaving the hash in the URL and killing the next click.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
