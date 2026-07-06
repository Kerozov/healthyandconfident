/** Segment keys assigned from registration health checkboxes */
export const HEALTH_SEGMENT = {
  insulinResistance: "insulin-resistance",
  diabetes: "diabetes",
  general: "weight-loss",
} as const;

export type HealthSelection = {
  insulinResistance: boolean;
  diabetes: boolean;
  general: boolean;
};

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
