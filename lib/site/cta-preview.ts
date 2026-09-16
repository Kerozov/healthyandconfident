/**
 * The admin's button screen frames a real page of the public site and points at
 * one button, so whoever is editing can see the button instead of guessing from
 * a description.
 *
 * Both halves of that conversation live here: the query flag the page is opened
 * with, and the messages the two windows exchange afterwards. Admin and site are
 * one app, so every message is same-origin and anything else is ignored.
 */

export const CTA_PREVIEW_PARAM = "cta_preview";

/** Tags our messages so an unrelated postMessage is never mistaken for one. */
export const CTA_PREVIEW_SOURCE = "hc-cta-preview";

/** Admin → previewed page: live text while the admin types. */
export type CtaPreviewCommand = {
  source: typeof CTA_PREVIEW_SOURCE;
  type: "label";
  key: string;
  /** `null` puts the text the page renders itself back. */
  label: string | null;
};

/** Previewed page → admin. */
export type CtaPreviewReport = {
  source: typeof CTA_PREVIEW_SOURCE;
  type: "found";
  key: string;
  /** How many copies of the button this page renders. 0 = nothing to show. */
  count: number;
  /** True when every copy is a button the site currently hides. */
  hidden: boolean;
};

function paramsOf(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export function ctaPreviewKeyFromSearch(search: string): string | null {
  const key = paramsOf(search).get(CTA_PREVIEW_PARAM)?.trim();
  return key || null;
}

/** True while this page is being shown as a button preview, framed or not. */
export function isCtaPreviewPage(): boolean {
  if (typeof window === "undefined") return false;
  return ctaPreviewKeyFromSearch(window.location.search) !== null;
}

/** `/bg/programs/x` + a button key → the URL that opens that page highlighted. */
export function ctaPreviewUrl(path: string, key: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${CTA_PREVIEW_PARAM}=${encodeURIComponent(key)}`;
}

function tagged(data: unknown): data is { source: string; type: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { source?: unknown }).source === CTA_PREVIEW_SOURCE &&
    typeof (data as { type?: unknown }).type === "string"
  );
}

export function isCtaPreviewCommand(data: unknown): data is CtaPreviewCommand {
  return tagged(data) && data.type === "label";
}

export function isCtaPreviewReport(data: unknown): data is CtaPreviewReport {
  return tagged(data) && data.type === "found";
}

/** CSS selector for every copy of one button on the page. */
export function ctaPreviewSelector(key: string): string {
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(key)
      : key.replace(/["\\]/g, "\\$&");
  return `[data-cta-key="${escaped}"]`;
}
