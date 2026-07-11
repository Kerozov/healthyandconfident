/** Segment keys assigned from registration health checkboxes */
export const HEALTH_SEGMENT = {
  insulinResistance: "insulin-resistance",
  diabetes: "diabetes",
  general: "weight-loss",
} as const;

export const HEALTH_SEGMENT_LABELS_BG: Record<
  (typeof HEALTH_SEGMENT)[keyof typeof HEALTH_SEGMENT],
  string
> = {
  [HEALTH_SEGMENT.insulinResistance]: "Инсулинова резистентност",
  [HEALTH_SEGMENT.diabetes]: "Диабет тип 2",
  [HEALTH_SEGMENT.general]: "Общо отслабване / енергия",
};

export const ALL_HEALTH_TAG_KEYS = Object.values(HEALTH_SEGMENT);

export type HealthSelection = {
  insulinResistance: boolean;
  diabetes: boolean;
  general: boolean;
};

export function healthSelectionFromTags(tags: string[]): HealthSelection {
  return {
    insulinResistance: tags.includes(HEALTH_SEGMENT.insulinResistance),
    diabetes: tags.includes(HEALTH_SEGMENT.diabetes),
    general: tags.includes(HEALTH_SEGMENT.general),
  };
}

export function healthInterestLabelsFromTags(tags: string[]): string[] {
  return ALL_HEALTH_TAG_KEYS.filter((key) => tags.includes(key)).map(
    (key) => HEALTH_SEGMENT_LABELS_BG[key],
  );
}

export function applyHealthSelectionToTags(
  currentTags: string[],
  selection: HealthSelection,
): string[] {
  const nonHealth = currentTags.filter(
    (tag) => !ALL_HEALTH_TAG_KEYS.includes(tag as (typeof ALL_HEALTH_TAG_KEYS)[number]),
  );
  return Array.from(new Set([...nonHealth, ...tagsFromHealthSelection(selection)]));
}

export function tagsFromHealthSelection(selection: HealthSelection): string[] {
  if (selection.general) {
    return [HEALTH_SEGMENT.general];
  }
  const tags: string[] = [];
  if (selection.insulinResistance) tags.push(HEALTH_SEGMENT.insulinResistance);
  if (selection.diabetes) tags.push(HEALTH_SEGMENT.diabetes);
  if (tags.length === 0) tags.push(HEALTH_SEGMENT.general);
  return tags;
}

export const HEALTH_SEGMENT_LABELS_EN: Record<
  (typeof HEALTH_SEGMENT)[keyof typeof HEALTH_SEGMENT],
  string
> = {
  [HEALTH_SEGMENT.insulinResistance]: "Insulin resistance",
  [HEALTH_SEGMENT.diabetes]: "Type 2 Diabetes",
  [HEALTH_SEGMENT.general]: "General weight loss / energy",
};

export const HEALTH_INTEREST_OPTIONS = [
  {
    key: "insulinResistance" as const,
    tag: HEALTH_SEGMENT.insulinResistance,
    label_bg: HEALTH_SEGMENT_LABELS_BG[HEALTH_SEGMENT.insulinResistance],
    label_en: HEALTH_SEGMENT_LABELS_EN[HEALTH_SEGMENT.insulinResistance],
  },
  {
    key: "diabetes" as const,
    tag: HEALTH_SEGMENT.diabetes,
    label_bg: HEALTH_SEGMENT_LABELS_BG[HEALTH_SEGMENT.diabetes],
    label_en: HEALTH_SEGMENT_LABELS_EN[HEALTH_SEGMENT.diabetes],
  },
  {
    key: "general" as const,
    tag: HEALTH_SEGMENT.general,
    label_bg: HEALTH_SEGMENT_LABELS_BG[HEALTH_SEGMENT.general],
    label_en: HEALTH_SEGMENT_LABELS_EN[HEALTH_SEGMENT.general],
  },
];

export function healthSelectionFromAnswerKey(key: string): HealthSelection | null {
  if (key === HEALTH_SEGMENT.insulinResistance) {
    return { insulinResistance: true, diabetes: false, general: false };
  }
  if (key === HEALTH_SEGMENT.diabetes) {
    return { insulinResistance: false, diabetes: true, general: false };
  }
  if (key === HEALTH_SEGMENT.general) {
    return { insulinResistance: false, diabetes: false, general: true };
  }
  return null;
}

export function healthLabelForTag(tag: string, locale: "bg" | "en" = "bg"): string {
  if (!(ALL_HEALTH_TAG_KEYS as string[]).includes(tag)) return tag;
  return locale === "en"
    ? HEALTH_SEGMENT_LABELS_EN[tag as (typeof ALL_HEALTH_TAG_KEYS)[number]]
    : HEALTH_SEGMENT_LABELS_BG[tag as (typeof ALL_HEALTH_TAG_KEYS)[number]];
}

export function fullNameFromParts(
  firstName: string,
  lastName: string,
): string | null {
  const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  return full || null;
}
