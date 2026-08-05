"use client";

import { useEffect } from "react";

/**
 * Every in-page jump goes through here, so a second click on the same link
 * always scrolls again. Browsers (and the Next.js router) skip the jump when the
 * URL already carries that hash, which used to leave the button dead after the
 * visitor scrolled away. The hash is wiped from the address bar right after the
 * scroll starts, so the URL never claims we are parked on a section.
 */

/** Fallback when the section carries no `scroll-mt-*` — roughly the header height. */
const HEADER_OFFSET = 88;

function scrollToId(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;

  // Sections declare their own clearance with `scroll-mt-24`; honour it.
  const declared = parseFloat(getComputedStyle(target).scrollMarginTop);
  const offset = Number.isFinite(declared) && declared > 0 ? declared : HEADER_OFFSET;

  const top = target.getBoundingClientRect().top + window.scrollY - offset;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(top, 0), behavior: reduceMotion ? "auto" : "smooth" });
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
  useEffect(() => {
    // Landing on /bg#contact from another page still has to scroll once.
    const initial = decodeURIComponent(window.location.hash.slice(1));
    if (initial) {
      let attempts = 0;
      const tryScroll = () => {
        if (scrollToId(initial) || attempts > 20) {
          stripHash();
          return;
        }
        attempts += 1;
        requestAnimationFrame(tryScroll);
      };
      requestAnimationFrame(tryScroll);
    }

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

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
