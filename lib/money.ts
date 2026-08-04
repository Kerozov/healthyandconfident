/** Money helpers shared by server reports and admin dashboards. */

/** Formats minor units (cents/pence) in the given currency. */
export function formatMoney(
  cents: number,
  currency: string,
  locale = "bg-BG",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (currency || "GBP").toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Compact form for chart axes and tight cards — "1,2 хил." instead of "1 200". */
export function formatMoneyCompact(
  cents: number,
  currency: string,
  locale = "bg-BG",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (currency || "GBP").toUpperCase(),
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function formatPercent(value: number, locale = "bg-BG"): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatNumber(value: number, locale = "bg-BG"): string {
  return new Intl.NumberFormat(locale).format(value);
}
