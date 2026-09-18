import type { Locale } from "@/i18n/config";
import { shortenProgramHref } from "@/lib/programs/types";

/**
 * How a Markdown link asks to be drawn as a button: its title. `[Text](url
 * "button")` is a filled button, `[Text](url "button-2")` an outlined one.
 * The Bulgarian words are accepted too, since that is what gets typed.
 */
export type MarkdownLinkStyle = "link" | "button" | "button-outline";

const BUTTON_TITLES: Record<string, MarkdownLinkStyle> = {
  button: "button",
  бутон: "button",
  "button-2": "button-outline",
  "бутон-2": "button-outline",
  "button-outline": "button-outline",
};

export function markdownLinkStyle(title: string | null | undefined): MarkdownLinkStyle {
  const key = (title ?? "").trim().toLowerCase();
  return BUTTON_TITLES[key] ?? "link";
}

/** The title we put in the Markdown for each style — the inverse of the above. */
export const MARKDOWN_BUTTON_TITLE: Record<
  Exclude<MarkdownLinkStyle, "link">,
  string
> = {
  button: "button",
  "button-outline": "button-2",
};

/** Site sections a post can link to without spelling out the language. */
const LOCALIZED_SECTIONS = /^\/(programs|products|guides|blog|forms|checkout|support|privacy|terms)(\/|$|[?#])/;

/**
 * An `href` typed into a post, made ready for the page it renders on: our own
 * pages get the post's language in front (`/programs/21-dni` on a Bulgarian
 * post opens `/bg/programs/21-dni`), programme links are shortened, and a
 * `javascript:` URL is dropped so nothing typed into the admin can run on the
 * public site. Images, anchors and outside links pass through unchanged.
 */
export function resolveMarkdownHref(href: string | null | undefined, locale: Locale): string {
  const value = (href ?? "").trim();
  if (!value) return "";
  if (value.startsWith("#")) return value;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";

  const path = shortenProgramHref(value);
  if (/^\/(bg|en)(\/|$|[?#])/.test(path)) return path;
  if (LOCALIZED_SECTIONS.test(path)) return `/${locale}${path}`;
  if (path === "/") return `/${locale}`;
  return path;
}
