/**
 * Working title for the cooking programme.
 *
 * The public name is not final. Change `bg` and `en` here and the landing,
 * the header, the footer and the admin button group pick it up. The id and
 * the public path stay put so links and the Stripe buttons do not break.
 */
export const KUHNYA_NAME = {
  bg: "Кухня без резистентност",
  en: "Kitchen Without Resistance",
} as const;

export const KUHNYA_ID = "kuhnya-bez-rezistentnost" as const;

/** Short address: `/programs/kuhnya`. */
export const KUHNYA_PUBLIC_SLUG = "kuhnya" as const;

/**
 * Admin → Сайт → Бутони. The price on the page is the Stripe price attached
 * to `${KUHNYA_PLACEMENT_KEY}_pricing_0`. No amount is stored in code.
 */
export const KUHNYA_PLACEMENT_KEY = `product_${KUHNYA_ID}` as const;

/**
 * Not confirmed. Flip to true to show one card whose title is
 * `KUHNYA_CHALLENGE_BONUS_TITLE`.
 */
export const KUHNYA_SHOW_CHALLENGE_BONUS = false;

export const KUHNYA_CHALLENGE_BONUS_TITLE = {
  bg: "Бонус: 3-дневно предизвикателство за бърз старт в кухнята.",
  en: "Bonus: a 3-day challenge for a fast start in the kitchen.",
} as const;

/** Stored on the subscriber so this waitlist is not mixed with the free menu. */
export const KUHNYA_SIGNUP_SOURCE = `program-${KUHNYA_ID}` as const;
export const KUHNYA_SIGNUP_TAG = "kuhnya-bez-rezistentnost" as const;

export function isKuhnyaProgramPath(pathname: string): boolean {
  return new RegExp(`^/(bg|en)/programs/${KUHNYA_PUBLIC_SLUG}/?$`).test(pathname);
}
