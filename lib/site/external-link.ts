/**
 * A link that takes the visitor off the site — YouTube, Facebook, a Stripe
 * page, a Zoom room — opens in a new tab, so the page they were reading stays
 * put. `/buy/…` counts too: it is our own address, but it lands on Stripe.
 *
 * Phone and mail links are left alone. They hand off to another app, and a
 * blank tab behind the dialler is all `_blank` would add.
 */
export function leavesSite(href: string | null | undefined): boolean {
  const value = (href ?? "").trim();
  return /^https?:\/\//i.test(value) || /^\/buy\//.test(value);
}

/** The `target` / `rel` pair for an anchor, when the href leaves the site. */
export function externalLinkProps(
  href: string | null | undefined,
): { target?: "_blank"; rel?: string } {
  return leavesSite(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}
