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

export function fullNameFromParts(
  firstName: string,
  lastName: string,
): string | null {
  const full = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  return full || null;
}
