import type { Locale } from "@/i18n/config";

/** Segment every free-menu signup lands in; the menu email automations start from it. */
export const FREE_MENU_TAG = "free-menu";

/** Source recorded for signups made on the menu's own page. */
export const FREE_MENU_PAGE_SOURCE = "free-menu-page";

/** The menu's own page - a link for ads, bios and messages that opens straight on the form. */
export function freeMenuPath(locale: Locale): string {
  return `/${locale}/free-menu`;
}

export function isFreeMenuPath(pathname: string): boolean {
  return /^\/(bg|en)\/free-menu\/?$/.test(pathname);
}

/**
 * Tags a free-menu signup carries, wherever the form sits: the menu segment
 * plus the admin's "save to segment" from /admin/popup. The popup and the page
 * share this so the two can never put people into different automations.
 */
export function freeMenuTags(segmentTag?: string | null): string[] {
  const extra = (segmentTag ?? "").trim();
  return extra && extra !== "all" && extra !== FREE_MENU_TAG
    ? [FREE_MENU_TAG, extra]
    : [FREE_MENU_TAG];
}
