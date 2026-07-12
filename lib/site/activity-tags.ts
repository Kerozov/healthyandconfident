/** Lead-magnet / activity tags — shown in the admin «Интерес» column. */
export const ACTIVITY_TAG = {
  freeMenu: "free-menu",
} as const;

export const ACTIVITY_TAG_LABELS_BG: Record<
  (typeof ACTIVITY_TAG)[keyof typeof ACTIVITY_TAG],
  string
> = {
  [ACTIVITY_TAG.freeMenu]: "Безплатно меню",
};

export const ACTIVITY_TAG_LABELS_EN: Record<
  (typeof ACTIVITY_TAG)[keyof typeof ACTIVITY_TAG],
  string
> = {
  [ACTIVITY_TAG.freeMenu]: "Free menu",
};

export const ALL_ACTIVITY_TAG_KEYS = Object.values(ACTIVITY_TAG);

export function activityInterestLabelsFromTags(tags: string[]): string[] {
  return ALL_ACTIVITY_TAG_KEYS.filter((key) => tags.includes(key)).map(
    (key) => ACTIVITY_TAG_LABELS_BG[key],
  );
}

export function isActivityTag(tag: string): boolean {
  return (ALL_ACTIVITY_TAG_KEYS as string[]).includes(tag);
}
