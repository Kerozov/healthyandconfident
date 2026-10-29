/**
 * `academy_product` on a product or guide: empty — no course code; this
 * marker — a code from the academy's default (every program); anything else —
 * the academy product or school slug.
 */
export const ACADEMY_ALL_PROGRAMS = "*";

/** What to send as `product` to the academy: nothing for the default. */
export function academyProductParam(stored: string | null | undefined): string | undefined {
  const value = stored?.trim().toLowerCase();
  return value && value !== ACADEMY_ALL_PROGRAMS ? value : undefined;
}
