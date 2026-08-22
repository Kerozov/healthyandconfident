import { publicSiteOrigin } from "@/lib/site";
import { publicFormUrl } from "@/lib/forms/urls";
import {
  normalizeProductLinkMode,
  productCheckoutUrl,
  type EmailProductLinkMode,
} from "@/lib/email/products-block";
import { productStripeForLocale } from "@/lib/site/product-locale";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { Locale, SiteProduct } from "@/lib/supabase/types";

export const SIGNATURE_LINK_LIMIT = 8;

export type SignatureLinkAppearance = "link" | "button";
export type SignatureLinkKind = "page" | "product" | "form" | "url";
export type SignaturePageKey =
  | "home"
  | "about"
  | "programs"
  | "food"
  | "results"
  | "contact"
  | "blog";

export type EmailSignatureLink = {
  id: string;
  label: string;
  appearance: SignatureLinkAppearance;
  kind: SignatureLinkKind;
  href: string;
  page: SignaturePageKey | "";
  productId: string;
  productLinkMode: EmailProductLinkMode;
  formId: string;
};

export const SIGNATURE_PAGE_OPTIONS: {
  value: SignaturePageKey;
  label: string;
}[] = [
  { value: "home", label: "Начало" },
  { value: "about", label: "За мен" },
  { value: "programs", label: "Програми" },
  { value: "food", label: "Хранене" },
  { value: "results", label: "Резултати" },
  { value: "contact", label: "Контакти" },
  { value: "blog", label: "Блог" },
];

const PAGE_KEYS = new Set<string>(SIGNATURE_PAGE_OPTIONS.map((o) => o.value));

export function newSignatureLinkId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newSignatureLink(): EmailSignatureLink {
  return {
    id: newSignatureLinkId(),
    label: "",
    appearance: "link",
    kind: "page",
    href: "",
    page: "contact",
    productId: "",
    productLinkMode: "site",
    formId: "",
  };
}

export type SignatureLinkCatalog = {
  products?: SiteProduct[];
  forms?: Array<Pick<FormTemplateRecord, "id" | "slug" | "title_bg" | "title_en" | "name">>;
  formHrefById?: Map<string, string>;
};

function isAppearance(value: unknown): value is SignatureLinkAppearance {
  return value === "link" || value === "button";
}

function isKind(value: unknown): value is SignatureLinkKind {
  return value === "page" || value === "product" || value === "form" || value === "url";
}

function isPageKey(value: unknown): value is SignaturePageKey {
  return typeof value === "string" && PAGE_KEYS.has(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseSignatureLinks(raw: unknown): EmailSignatureLink[] {
  if (!Array.isArray(raw)) return [];
  const links: EmailSignatureLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = isKind(row.kind) ? row.kind : "url";
    const page = isPageKey(row.page) ? row.page : kind === "page" ? "contact" : "";
    links.push({
      id: asString(row.id).trim() || newSignatureLinkId(),
      label: asString(row.label).trim(),
      appearance: isAppearance(row.appearance) ? row.appearance : "link",
      kind,
      href: asString(row.href).trim(),
      page,
      productId: asString(row.productId).trim(),
      productLinkMode: normalizeProductLinkMode(asString(row.productLinkMode)),
      formId: asString(row.formId).trim(),
    });
    if (links.length >= SIGNATURE_LINK_LIMIT) break;
  }
  return links;
}

export function signaturePagePath(
  page: SignaturePageKey,
  locale: Locale,
): string {
  if (page === "blog") return `/${locale}/blog`;
  if (page === "home") return `/${locale}`;
  return `/${locale}#${page}`;
}

function absoluteHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return `${publicSiteOrigin()}${trimmed}`;
  }
  return trimmed;
}

export function isSafeSignatureHref(href: string): boolean {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return false;
}

export function signatureLinkHref(
  link: EmailSignatureLink,
  locale: Locale,
  catalog?: SignatureLinkCatalog,
): string {
  if (link.kind === "page") {
    const page = isPageKey(link.page) ? link.page : "home";
    return absoluteHref(signaturePagePath(page, locale));
  }

  if (link.kind === "product" && link.productId) {
    const product = catalog?.products?.find(
      (item) => item.id.toLowerCase() === link.productId.toLowerCase(),
    );
    if (link.productLinkMode === "stripe") {
      if (product) {
        const paymentLink = productStripeForLocale(product, locale).stripe_url;
        if (paymentLink) return absoluteHref(paymentLink);
      }
      if (link.href) return absoluteHref(link.href);
    }
    return productCheckoutUrl(link.productId, locale);
  }

  if (link.kind === "form" && link.formId) {
    const invited = catalog?.formHrefById?.get(link.formId.toLowerCase());
    if (invited) return absoluteHref(invited);
    const form = catalog?.forms?.find(
      (item) => item.id.toLowerCase() === link.formId.toLowerCase(),
    );
    if (form?.slug) return publicFormUrl(form.slug, locale);
    if (link.href) return absoluteHref(link.href);
    return "";
  }

  return absoluteHref(link.href);
}

export function serializeSignatureLinks(
  links: EmailSignatureLink[],
  locale: Locale,
  catalog?: SignatureLinkCatalog,
): EmailSignatureLink[] {
  return parseSignatureLinks(links).map((link) => ({
    ...link,
    href: signatureLinkHref(link, locale, catalog),
  }));
}

export function signatureLinksNeedFormInvites(links: EmailSignatureLink[]): boolean {
  return parseSignatureLinks(links).some((link) => link.kind === "form" && link.formId);
}
