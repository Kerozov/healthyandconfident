/** Activity / source tags for tracking where the person came from. */
export const ACTIVITY_SEGMENT = {
  freeMenu: "free-menu",
} as const;

const FREE_MENU_SOURCES = new Set([
  "menu-popup",
  "free-menu-banner",
  "auto-popup",
  "hero",
  "menu-button",
  "nav-header",
  "nav-mobile",
  "lead-magnet",
]);

/** Extra segment keys to attach based on signup source (free menu, etc.). */
export function activityTagsForSource(source: string): string[] {
  const s = (source || "").toLowerCase();
  if (FREE_MENU_SOURCES.has(s) || s.includes("menu") || s.includes("popup")) {
    return [ACTIVITY_SEGMENT.freeMenu];
  }
  return [];
}
