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
