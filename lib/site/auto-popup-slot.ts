/**
 * One automatic popup per visit. The menu signup and the Black Friday offer
 * both open on their own after a few seconds; without this they could stack
 * on top of each other or come one right after the other.
 *
 * Module state lives as long as the site layout, i.e. until a full reload.
 */

let owner: string | null = null;

/**
 * Claims the slot ahead of time. The Black Friday popup does this on mount,
 * so a menu popup timer that fires while the offers are still loading steps
 * aside instead of taking the visit.
 */
export function reserveAutoPopup(name: string): void {
  if (!owner) owner = name;
}

/** Gives the slot back when the reserved popup will not show after all. */
export function releaseAutoPopup(name: string): void {
  if (owner === name) owner = null;
}

/**
 * Whether `name` may open now: nobody else took this visit and no other
 * dialog (a manually opened form, an offer) is on screen.
 */
export function takeAutoPopup(name: string): boolean {
  if (owner && owner !== name) return false;
  if (typeof document !== "undefined" && document.querySelector('[aria-modal="true"]')) {
    return false;
  }
  owner = name;
  return true;
}
