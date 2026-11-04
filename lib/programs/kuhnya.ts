/**
 * Display name for the cooking programme.
 *
 * Change `bg` and `en` here and the landing,
 * the header, the footer and the admin button group pick it up. The id and
 * the public path stay put so links and the Stripe buttons do not break.
 */
export const KUHNYA_NAME = {
  bg: "Здравословно хранене за заети хора",
  en: "Healthy Eating for Busy People",
} as const;

export const KUHNYA_ID = "kuhnya-bez-rezistentnost" as const;

/** Short address: `/programs/kuhnya`. */
export const KUHNYA_PUBLIC_SLUG = "kuhnya" as const;

/**
 * Admin → Сайт → Бутони. Once a Stripe price is attached to
 * `${KUHNYA_PLACEMENT_KEY}_pricing_0`, the page quotes that price and the
 * button opens Checkout. Until then the page quotes `KUHNYA_PRICE`.
 */
export const KUHNYA_PLACEMENT_KEY = `product_${KUHNYA_ID}` as const;

/** Euros, shown while the price button has no Stripe price. */
export const KUHNYA_PRICE = 39;

/** Euros, struck through next to the price. */
export const KUHNYA_OLD_PRICE = 69;

/**
 * Not confirmed. Flip to true to show one card whose title is
 * `KUHNYA_CHALLENGE_BONUS_TITLE`.
 */
export const KUHNYA_SHOW_CHALLENGE_BONUS = false;

export const KUHNYA_CHALLENGE_BONUS_TITLE = {
  bg: "Бонус: 3-дневно предизвикателство за бърз старт в кухнята.",
  en: "Bonus: a 3-day challenge for a fast start in the kitchen.",
} as const;

export function isKuhnyaProgramPath(pathname: string): boolean {
  return new RegExp(`^/(bg|en)/programs/${KUHNYA_PUBLIC_SLUG}/?$`).test(pathname);
}
