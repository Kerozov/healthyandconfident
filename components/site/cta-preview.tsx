"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CTA_PREVIEW_SOURCE,
  ctaPreviewKeyFromSearch,
  ctaPreviewSelector,
  isCtaPreviewCommand,
  type CtaPreviewReport,
} from "@/lib/site/cta-preview";

/** The URL and the frame we sit in never change under us — nothing to subscribe to. */
const noSubscribe = () => () => {};

function usePreviewKeyFromUrl(): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => ctaPreviewKeyFromSearch(window.location.search),
    () => null,
  );
}

function useFramed(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => window.self !== window.top,
    () => false,
  );
}

/**
 * True when the page is open as a button preview. Buttons the site would hide
 * are still drawn in that case — an admin looking for a button needs to see
 * where it sits even while it is switched off.
 */
export function useIsCtaPreview(): boolean {
  return usePreviewKeyFromUrl() !== null;
}

type Box = { top: number; left: number; width: number; height: number; hidden: boolean };

const PAD = 8;
const SCRIM = "rgba(15, 23, 42, 0.45)";
/** Pixels off dead centre we stop caring about. */
const CENTRED_ENOUGH = 48;

function measure(key: string): Box[] {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(ctaPreviewSelector(key)),
  );
  return nodes
    .map((node) => {
      const r = node.getBoundingClientRect();
      return {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        hidden: node.dataset.ctaHidden === "true",
      };
    })
    .filter((b) => b.width > 0 && b.height > 0);
}

/**
 * Darkens the page around the button the admin is editing and rings it, so the
 * answer to "which button is this" is the only lit thing on screen.
 *
 * Mounted on every public page but completely inert without the preview flag.
 */
export function CtaPreviewHighlighter() {
  const key = usePreviewKeyFromUrl();
  const framed = useFramed();
  const [boxes, setBoxes] = useState<Box[]>([]);
  /** Page text of each button, so clearing the admin field restores it. */
  const originals = useRef(new WeakMap<HTMLElement, string>());

  useEffect(() => {
    if (!key) return;

    // Only the simple case is retyped live: a button whose whole content is one
    // piece of text. Anything richer keeps its markup rather than losing an icon.
    function applyLabel(target: string, label: string | null) {
      document
        .querySelectorAll<HTMLElement>(ctaPreviewSelector(target))
        .forEach((node) => {
          const only = node.childNodes.length === 1 ? node.firstChild : null;
          if (!only || only.nodeType !== Node.TEXT_NODE) return;
          if (!originals.current.has(node)) {
            originals.current.set(node, only.textContent ?? "");
          }
          only.textContent = label ?? originals.current.get(node) ?? "";
        });
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const msg: unknown = event.data;
      if (!isCtaPreviewCommand(msg)) return;
      applyLabel(msg.key, msg.label);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [key]);

  // Follows the button through scrolling, images loading and layout shifts, and
  // parks it in the middle of the view until the page stops moving under it.
  useEffect(() => {
    if (!key) return;
    let raf = 0;
    let lastBoxes = "";
    let lastReport = "";
    let firstSeen = 0;
    let settled = false;

    // Late images and webfonts push the button around, so centring is repeated
    // until it holds still. Instant, never animated: an animation started every
    // frame would fight itself and never arrive.
    const centre = (now: number) => {
      if (settled || !window.innerHeight) return;
      const el = document.querySelector<HTMLElement>(ctaPreviewSelector(key));
      if (!el) return;
      if (!firstSeen) firstSeen = now;
      const r = el.getBoundingClientRect();
      const off = Math.abs(r.top + r.height / 2 - window.innerHeight / 2);
      if (off <= CENTRED_ENOUGH) {
        if (now - firstSeen > 1200) settled = true;
        return;
      }
      if (now - firstSeen > 4000) {
        settled = true;
        return;
      }
      const top = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
      window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
    };

    const tick = (now: number) => {
      centre(now);
      const next = measure(key);
      const signature = JSON.stringify(next);
      if (signature !== lastBoxes) {
        lastBoxes = signature;
        setBoxes(next);
      }
      const report: CtaPreviewReport = {
        source: CTA_PREVIEW_SOURCE,
        type: "found",
        key,
        count: next.length,
        hidden: next.length > 0 && next.every((b) => b.hidden),
      };
      const stamp = `${report.count}:${report.hidden}`;
      if (stamp !== lastReport) {
        lastReport = stamp;
        window.parent?.postMessage(report, window.location.origin);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);

  // Inside the admin frame the page is something to look at, not to use: a
  // stray click must not navigate the preview away from the button.
  useEffect(() => {
    if (!key || !framed) return;
    const swallow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", swallow, true);
    document.addEventListener("submit", swallow, true);
    return () => {
      document.removeEventListener("click", swallow, true);
      document.removeEventListener("submit", swallow, true);
    };
  }, [key, framed]);

  if (!key || boxes.length === 0) return null;

  const first = boxes[0];
  const top = first.top - PAD;
  const left = first.left - PAD;
  const width = first.width + PAD * 2;
  const height = first.height + PAD * 2;
  const labelAbove = top > 42;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes hcCtaPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.45); }
          50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0.15); }
        }
      `}</style>

      {/* Scrim with a hole cut around the button, built from four plain rects. */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: Math.max(top, 0), background: SCRIM }} />
      <div style={{ position: "fixed", top: Math.max(top, 0), left: 0, width: Math.max(left, 0), height, background: SCRIM }} />
      <div style={{ position: "fixed", top: Math.max(top, 0), left: left + width, right: 0, height, background: SCRIM }} />
      <div style={{ position: "fixed", top: top + height, left: 0, right: 0, bottom: 0, background: SCRIM }} />

      {boxes.map((box, i) => (
        <div
          key={`${box.top}-${box.left}-${i}`}
          style={{
            position: "fixed",
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            border: "3px solid rgb(245, 158, 11)",
            borderRadius: 14,
            animation: "hcCtaPulse 1.8s ease-in-out infinite",
          }}
        />
      ))}

      <span
        style={{
          position: "fixed",
          top: labelAbove ? top - 34 : top + height + 10,
          left: Math.max(left, 8),
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          borderRadius: 999,
          background: "rgb(245, 158, 11)",
          color: "rgb(15, 23, 42)",
          padding: "5px 12px",
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "nowrap",
          boxShadow: "0 6px 20px rgba(15, 23, 42, 0.35)",
        }}
      >
        {first.hidden ? "Този бутон (в момента е скрит)" : "Този бутон редактираш"}
        {boxes.length > 1 ? ` · ${boxes.length} места на страницата` : ""}
      </span>

      {!framed && (
        <span
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            borderRadius: 999,
            background: "rgba(15, 23, 42, 0.9)",
            color: "white",
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Преглед от админ панела
        </span>
      )}
    </div>
  );
}
