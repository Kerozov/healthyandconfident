import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { slugify } from "@/lib/utils";
import { publicSiteOrigin } from "@/lib/site";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import { guidePagePath, productCheckoutPath } from "@/lib/site/product-placement";
import { guideSellableInLocale, guideVisibleInLocale } from "@/lib/site/guide-catalog";
import {
  productSellableInLocale,
  productVisibleInLocale,
} from "@/lib/site/product-locale";

/**
 * Where a card or a shared link for one catalogue row sends the visitor.
 *
 * `page` lands on that row's own page — for a product this is also where its
 * configured upsell runs, which is why it stays the default.
 * `direct` skips the page and opens Stripe straight away.
 * `custom` sends the visitor wherever the admin typed instead.
 */
export type CatalogLinkMode = "page" | "direct" | "custom";

export const CATALOG_LINK_MODES: CatalogLinkMode[] = ["page", "direct", "custom"];

export function normalizeCatalogLinkMode(
  value: string | null | undefined,
): CatalogLinkMode {
  if (value === "direct" || value === "custom") return value;
  return "page";
}

/** Longest slug we store — room for a real title, short enough to paste. */
export const MAX_SLUG_LENGTH = 60;

/**
 * The site-wide `slugify` cut down to something that belongs in a link: no
 * dangling dashes, no title-length URLs. Returns `""` when a title leaves
 * nothing usable behind, and the row then keeps being addressed by its id.
 */
export function catalogSlug(value: string | null | undefined): string {
  return slugify(value ?? "")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/**
 * `my-guide`, `my-guide-2`, `my-guide-3`… — the first one no other row in the
 * same table is already using.
 */
export function uniqueCatalogSlug(base: string, taken: Iterable<string>): string {
  if (!base) return "";
  const used = new Set([...taken].map((s) => s.toLowerCase()));
  if (!used.has(base)) return base;

  for (let n = 2; n < 500; n += 1) {
    const suffix = `-${n}`;
    const head = base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "");
    const candidate = `${head}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  return "";
}

export type CatalogKind = "guide" | "product";

export function isCatalogKind(value: string): value is CatalogKind {
  return value === "guide" || value === "product";
}

/** Row shape every helper here needs — the tables share it. */
export type CatalogItem = {
  id: string;
  slug?: string | null;
  link_mode?: string | null;
  link_url?: string | null;
};

/**
 * The piece that identifies the row inside a URL: its slug once it has one,
 * its id until then. Links built from the id keep working forever — a slug is
 * a nicer name for the same row, never a replacement address.
 */
export function catalogRef(item: CatalogItem): string {
  return item.slug?.trim() || item.id;
}

/**
 * Route params reach us already decoded, but a URL someone typed by hand can
 * still carry a stray `%` that makes `decodeURIComponent` throw — and a bad
 * link must miss, not crash the request.
 */
export function safeDecodeRef(ref: string): string {
  try {
    return decodeURIComponent(ref).trim();
  } catch {
    return ref.trim();
  }
}

/** True when this row is the one addressed by `ref` — slug or id, any case. */
export function catalogMatchesRef(item: CatalogItem, ref: string): boolean {
  const wanted = safeDecodeRef(ref).toLowerCase();
  if (!wanted) return false;
  if (item.id.toLowerCase() === wanted) return true;
  return (item.slug?.trim().toLowerCase() ?? "") === wanted;
}

export function catalogPagePath(
  kind: CatalogKind,
  item: CatalogItem,
  locale: Locale,
): string {
  return kind === "guide"
    ? guidePagePath(item, locale)
    : productCheckoutPath(item, locale);
}

/**
 * The link that opens Stripe without the page in between. It is a route of our
 * own rather than the Payment Link itself, so the checkout still carries the
 * contact id and the ad-click ids, and so the link in someone's bio does not
 * change when the Stripe product behind it does.
 */
export function catalogDirectBuyPath(
  kind: CatalogKind,
  item: CatalogItem,
  locale: Locale,
): string {
  const query = locale === "bg" ? "" : `?l=${locale}`;
  return `/buy/${kind}/${encodeURIComponent(catalogRef(item))}${query}`;
}

/**
 * What we are willing to put in an `href`. `link_url` is typed into the admin
 * and rendered as a link, so a `javascript:` URL would run on the public site —
 * cheap to rule out, and a typo-ed host is turned into a real address instead
 * of a link relative to whatever page the visitor is on.
 */
export function normalizeCustomLinkUrl(value: string | null | undefined): string {
  const url = value?.trim() ?? "";
  if (!url) return "";
  if (url.startsWith("/") || url.startsWith("#")) return url;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  // Anything with a scheme we did not allow is dropped rather than guessed at.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return "";
  return `https://${url}`;
}

/**
 * Where this row's own button goes, honouring what the admin chose.
 *
 * `custom` falls back to the page when the URL field is empty, and `direct`
 * falls back to the page when the row cannot be bought in this language —
 * a button that opens a checkout which then refuses the sale is worse than one
 * that shows the offer.
 */
export function catalogButtonHref(
  kind: CatalogKind,
  item: CatalogItem,
  locale: Locale,
  sellable: boolean,
): string {
  const mode = normalizeCatalogLinkMode(item.link_mode);
  if (mode === "custom") {
    const custom = normalizeCustomLinkUrl(item.link_url);
    if (custom) return custom;
  }
  if (mode === "direct" && sellable) {
    return catalogDirectBuyPath(kind, item, locale);
  }
  return catalogPagePath(kind, item, locale);
}

export function guideButtonHref(guide: SiteGuide, locale: Locale): string {
  return catalogButtonHref(
    "guide",
    guide,
    locale,
    guideSellableInLocale(guide, locale),
  );
}

export function productButtonHref(product: SiteProduct, locale: Locale): string {
  return catalogButtonHref(
    "product",
    product,
    locale,
    productSellableInLocale(product, locale),
  );
}

/** A site-relative path turned into the link you can paste into a message. */
export function absoluteSiteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${publicSiteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type ShareLink = {
  /** What this link is, in the admin's words. */
  label: string;
  locale: Locale;
  path: string;
  url: string;
  /** True when it is the link this row's own buttons currently use. */
  primary: boolean;
  /** One line about what this link does differently, shown under it. */
  note?: string;
};

const LOCALE_NAME: Record<Locale, string> = { bg: "БГ", en: "EN" };

const LABELS = {
  guide: { page: "Страница на ръководството", direct: "Директно към плащането" },
  product: { page: "Страница на продукта", direct: "Директно към плащането" },
} as const;

/**
 * Every link that leads to one row, in the order the admin screen lists them:
 * the page first, then the direct-payment link, for each language the row is
 * shown in. This is the list behind the copy buttons.
 */
export function catalogShareLinks(
  kind: CatalogKind,
  item: SiteGuide | SiteProduct,
): ShareLink[] {
  const mode = normalizeCatalogLinkMode(item.link_mode);
  const links: ShareLink[] = [];

  for (const locale of locales) {
    const visible =
      kind === "guide"
        ? guideVisibleInLocale(item as SiteGuide, locale)
        : productVisibleInLocale(item as SiteProduct, locale);
    if (!visible) continue;

    const sellable =
      kind === "guide"
        ? guideSellableInLocale(item as SiteGuide, locale)
        : productSellableInLocale(item as SiteProduct, locale);

    const pagePath = catalogPagePath(kind, item, locale);
    links.push({
      label: `${LABELS[kind].page} — ${LOCALE_NAME[locale]}`,
      locale,
      path: pagePath,
      url: absoluteSiteUrl(pagePath),
      primary: mode === "page",
    });

    if (sellable) {
      const buyPath = catalogDirectBuyPath(kind, item, locale);
      links.push({
        label: `${LABELS[kind].direct} — ${LOCALE_NAME[locale]}`,
        locale,
        path: buyPath,
        url: absoluteSiteUrl(buyPath),
        primary: mode === "direct",
        note:
          kind === "product"
            ? "Прескача допълнителната оферта на страницата."
            : undefined,
      });
    }
  }

  if (mode === "custom") {
    const custom = normalizeCustomLinkUrl(item.link_url);
    if (custom) {
      links.unshift({
        label: "Собствен линк (бутоните водят тук)",
        locale: "bg",
        path: custom,
        url: absoluteSiteUrl(custom),
        primary: true,
      });
    }
  }

  return links;
}
