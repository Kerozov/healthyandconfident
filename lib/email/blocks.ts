/**
 * Block model behind the visual email builder.
 *
 * The whole send pipeline (campaigns, automations, forms) stores one HTML
 * string per email, so blocks serialize *into* that string instead of a new
 * column: every block becomes a single line of email-safe HTML carrying
 * `data-hc-*` attributes, and `parseEmailBlocks` reads them back. Anything the
 * builder does not recognise (older hand-written HTML, plain text, the legacy
 * product/form/button markers) still parses into an editable block, so nothing
 * written before the builder is lost.
 *
 * Two rules keep the round-trip safe:
 *  1. every serialized block is ONE line — blocks are joined with a blank line,
 *     which is exactly how `normalizeEmailBodyHtml` chunks the body;
 *  2. user text stays literal in the markup, so `{{name}}` / `{{email}}` are
 *     still substituted per recipient at send time.
 */

import {
  normalizeProductLinkMode,
  productEmailMarker,
  type EmailProductLinkMode,
} from "@/lib/email/products-block";

export type EmailBlockAlign = "left" | "center" | "right";
export type EmailTextSize = "sm" | "md" | "lg";
export type EmailButtonVariant = "gold" | "green" | "outline";

export type EmailColumn = {
  src: string;
  alt: string;
  text: string;
  href: string;
};

export type EmailBlock =
  | {
      id: string;
      type: "text";
      text: string;
      align: EmailBlockAlign;
      size: EmailTextSize;
    }
  | {
      id: string;
      type: "heading";
      text: string;
      level: 1 | 2 | 3;
      align: EmailBlockAlign;
    }
  | {
      id: string;
      type: "button";
      label: string;
      href: string;
      align: EmailBlockAlign;
      variant: EmailButtonVariant;
    }
  | {
      id: string;
      type: "image";
      src: string;
      alt: string;
      href: string;
      /** Percentage of the email width, 20–100. */
      width: number;
      align: EmailBlockAlign;
      radius: boolean;
      caption: string;
    }
  | { id: string; type: "columns"; columns: EmailColumn[] }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "list"; items: string[]; ordered: boolean }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number }
  | {
      id: string;
      type: "product";
      productId: string;
      /** `site` runs the upsell before Stripe; `stripe` jumps straight to it. */
      linkMode: EmailProductLinkMode;
    }
  | { id: string; type: "form"; formId: string }
  | { id: string; type: "html"; html: string };

export type EmailBlockType = EmailBlock["type"];

const SANS = "Arial,Helvetica,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const TEXT = "#1A2E1A";
const MUTED = "#5A7A5A";
const RULE = "rgba(45,122,71,0.18)";

/* ------------------------------------------------------------------ utils */

let idCounter = 0;

export function newEmailBlockId(): string {
  idCounter += 1;
  return `blk-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Attribute-safe escape. Newlines have to become entities as well: a raw one
 * inside `data-c0-text` would split the block across two lines and break the
 * one-block-per-line contract the parser relies on.
 */
function escAttr(text: string): string {
  return esc(text).replace(/\r/g, "").replace(/\n/g, "&#10;");
}

function unesc(text: string): string {
  return text
    .replace(/&#10;/g, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** User text → one line of HTML (newlines become `<br>`). */
function inline(text: string): string {
  return esc(text.trim()).replace(/\n/g, "<br>");
}

/** One line of HTML → user text. */
function outline(html: string): string {
  return unesc(html.replace(/<br\s*\/?>/gi, "\n")).trim();
}

export function isSafeEmailHref(href: string): boolean {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return false;
}

function attr(html: string, name: string): string {
  const match = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(html);
  return match ? unesc(match[1]) : "";
}

function innerHtml(html: string): string {
  const start = html.indexOf(">");
  const end = html.lastIndexOf("</");
  if (start < 0 || end <= start) return "";
  return html.slice(start + 1, end);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function align(value: string): EmailBlockAlign {
  return value === "center" || value === "right" ? value : "left";
}

/* -------------------------------------------------------------- factories */

const DEFAULT_COLUMN: EmailColumn = { src: "", alt: "", text: "", href: "" };

export function createEmailBlock(type: EmailBlockType): EmailBlock {
  const id = newEmailBlockId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2, align: "left" };
    case "button":
      return { id, type, label: "", href: "", align: "center", variant: "gold" };
    case "image":
      return {
        id,
        type,
        src: "",
        alt: "",
        href: "",
        width: 100,
        align: "center",
        radius: true,
        caption: "",
      };
    case "columns":
      return { id, type, columns: [{ ...DEFAULT_COLUMN }, { ...DEFAULT_COLUMN }] };
    case "quote":
      return { id, type, text: "" };
    case "list":
      return { id, type, items: [""], ordered: false };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, size: 24 };
    case "product":
      return { id, type, productId: "", linkMode: "site" };
    case "form":
      return { id, type, formId: "" };
    case "html":
      return { id, type, html: "" };
    default:
      return { id, type: "text", text: "", align: "left", size: "md" };
  }
}

/** True when a block carries nothing worth sending. */
export function isEmptyEmailBlock(block: EmailBlock): boolean {
  switch (block.type) {
    case "text":
    case "quote":
      return !block.text.trim();
    case "heading":
      return !block.text.trim();
    // A link-less button still renders (so it shows up while you type the
    // label) — only a label-less one is dropped on serialize.
    case "button":
      return !block.label.trim();
    case "image":
      return !block.src.trim();
    case "columns":
      return block.columns.every((c) => !c.src.trim() && !c.text.trim());
    case "list":
      return block.items.every((item) => !item.trim());
    case "product":
      return !block.productId;
    case "form":
      return !block.formId;
    case "html":
      return !block.html.trim();
    default:
      return false;
  }
}

/* ------------------------------------------------------------- serializers */

function textFontSize(size: EmailTextSize): number {
  return size === "sm" ? 14 : size === "lg" ? 18 : 16;
}

function serializeText(block: Extract<EmailBlock, { type: "text" }>): string {
  const px = textFontSize(block.size);
  return `<p data-hc="text" data-size="${block.size}" data-align="${block.align}" style="margin:0 0 16px;font-family:${SANS};font-size:${px}px;line-height:1.65;color:${TEXT};text-align:${block.align}">${inline(block.text)}</p>`;
}

function serializeHeading(
  block: Extract<EmailBlock, { type: "heading" }>,
): string {
  const px = block.level === 1 ? 28 : block.level === 2 ? 22 : 18;
  const tag = `h${block.level}`;
  return `<${tag} data-hc="heading" data-level="${block.level}" data-align="${block.align}" style="margin:26px 0 12px;font-family:${SERIF};font-size:${px}px;font-weight:600;line-height:1.3;color:${TEXT};text-align:${block.align}">${inline(block.text)}</${tag}>`;
}

function buttonColors(variant: EmailButtonVariant): {
  bg: string;
  fg: string;
  extra: string;
} {
  if (variant === "green") {
    return { bg: "#2D7A47", fg: "#FFFFFF", extra: "" };
  }
  if (variant === "outline") {
    return {
      bg: "transparent",
      fg: TEXT,
      extra: `border:2px solid ${TEXT};`,
    };
  }
  return { bg: "#F0B429", fg: TEXT, extra: "" };
}

function serializeButton(
  block: Extract<EmailBlock, { type: "button" }>,
): string {
  const label = block.label.trim();
  const href = block.href.trim();
  if (!label) return "";
  const { bg, fg, extra } = buttonColors(block.variant);
  const style = `display:inline-block;background-color:${bg};color:${fg};font-family:${SANS};font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;${extra}`;
  const content = isSafeEmailHref(href)
    ? `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" style="${style}">${esc(label)}</a>`
    : `<span style="${style}">${esc(label)}</span>`;
  return `<table data-hc="button" data-label="${escAttr(label)}" data-href="${escAttr(href)}" data-variant="${block.variant}" data-align="${block.align}" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0"><tr><td align="${block.align}" style="text-align:${block.align}">${content}</td></tr></table>`;
}

function imageMargin(value: EmailBlockAlign): string {
  if (value === "center") return "0 auto";
  if (value === "right") return "0 0 0 auto";
  return "0";
}

function serializeImage(block: Extract<EmailBlock, { type: "image" }>): string {
  const src = block.src.trim();
  if (!src) return "";
  const width = clamp(block.width, 20, 100);
  const px = Math.round((600 * width) / 100);
  const radius = block.radius ? ";border-radius:12px" : "";
  const img = `<img src="${escAttr(src)}" alt="${escAttr(block.alt)}" width="${px}" style="display:block;width:${width}%;max-width:100%;height:auto;margin:${imageMargin(block.align)};border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic${radius}" />`;
  const href = block.href.trim();
  const media = isSafeEmailHref(href)
    ? `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none">${img}</a>`
    : img;
  const caption = block.caption.trim()
    ? `<tr><td align="${block.align}" style="padding:8px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${MUTED};text-align:${block.align}">${inline(block.caption)}</td></tr>`
    : "";
  return `<table data-hc="image" data-src="${escAttr(src)}" data-alt="${escAttr(block.alt)}" data-href="${escAttr(href)}" data-width="${width}" data-align="${block.align}" data-radius="${block.radius ? 1 : 0}" data-caption="${escAttr(block.caption)}" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0"><tr><td align="${block.align}" style="padding:0;line-height:0;font-size:0">${media}</td></tr>${caption}</table>`;
}

function serializeColumns(
  block: Extract<EmailBlock, { type: "columns" }>,
): string {
  const cols = block.columns.slice(0, 3);
  if (cols.length === 0) return "";
  const maxWidth = cols.length >= 3 ? 172 : 262;
  const msoWidth = Math.floor(100 / cols.length);

  const cells = cols
    .map((col, i) => {
      const open =
        i === 0
          ? `<!--[if mso]><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="${msoWidth}%" valign="top"><![endif]-->`
          : `<!--[if mso]></td><td width="${msoWidth}%" valign="top"><![endif]-->`;
      const src = col.src.trim();
      const image = src
        ? `<img src="${escAttr(src)}" alt="${escAttr(col.alt)}" width="${maxWidth - 12}" style="display:block;width:100%;height:auto;border:0;border-radius:10px" />`
        : "";
      const href = col.href.trim();
      const media =
        image && isSafeEmailHref(href)
          ? `<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none">${image}</a>`
          : image;
      const text = col.text.trim()
        ? `<p style="margin:${image ? "10px" : "0"} 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${TEXT};text-align:center">${inline(col.text)}</p>`
        : "";
      return `${open}<div style="display:inline-block;vertical-align:top;width:100%;max-width:${maxWidth}px;padding:0 6px;box-sizing:border-box;text-align:center">${media}${text}</div>`;
    })
    .join("");

  const data = cols
    .map(
      (col, i) =>
        ` data-c${i}-src="${escAttr(col.src)}" data-c${i}-alt="${escAttr(col.alt)}" data-c${i}-text="${escAttr(col.text)}" data-c${i}-href="${escAttr(col.href)}"`,
    )
    .join("");

  return `<table data-hc="columns" data-cols="${cols.length}"${data} role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0"><tr><td align="center" style="padding:0;font-size:0;line-height:0">${cells}<!--[if mso]></td></tr></table><![endif]--></td></tr></table>`;
}

function serializeQuote(block: Extract<EmailBlock, { type: "quote" }>): string {
  if (!block.text.trim()) return "";
  return `<table data-hc="quote" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0"><tr><td style="padding:16px 20px;background-color:#F6F7F3;border-left:4px solid #2D7A47;border-radius:0 10px 10px 0"><p style="margin:0;font-family:${SERIF};font-size:17px;font-style:italic;line-height:1.6;color:${TEXT}">${inline(block.text)}</p></td></tr></table>`;
}

function serializeList(block: Extract<EmailBlock, { type: "list" }>): string {
  const items = block.items.map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return "";
  const tag = block.ordered ? "ol" : "ul";
  const rows = items
    .map((item) => `<li style="margin:0 0 8px">${inline(item)}</li>`)
    .join("");
  return `<${tag} data-hc="list" data-ordered="${block.ordered ? 1 : 0}" style="margin:0 0 16px;padding-left:24px;font-family:${SANS};font-size:16px;line-height:1.65;color:${TEXT}">${rows}</${tag}>`;
}

function serializeDivider(): string {
  return `<table data-hc="divider" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0"><tr><td style="padding:12px 0"><div style="height:1px;background-color:${RULE};line-height:1px;font-size:0">&nbsp;</div></td></tr></table>`;
}

function serializeSpacer(block: Extract<EmailBlock, { type: "spacer" }>): string {
  const size = clamp(block.size, 4, 120);
  return `<div data-hc="spacer" data-size="${size}" style="height:${size}px;line-height:${size}px;font-size:0">&nbsp;</div>`;
}

/** One block → one line of email HTML (empty string when there is nothing to render). */
export function serializeEmailBlock(block: EmailBlock): string {
  switch (block.type) {
    case "text":
      return block.text.trim() ? serializeText(block) : "";
    case "heading":
      return block.text.trim() ? serializeHeading(block) : "";
    case "button":
      return serializeButton(block);
    case "image":
      return serializeImage(block);
    case "columns":
      return serializeColumns(block);
    case "quote":
      return serializeQuote(block);
    case "list":
      return serializeList(block);
    case "divider":
      return serializeDivider();
    case "spacer":
      return serializeSpacer(block);
    case "product":
      return block.productId
        ? productEmailMarker(block.productId, block.linkMode)
        : "";
    case "form":
      return block.formId ? `<!-- hc-email-form:${block.formId} -->` : "";
    case "html":
      return block.html.trim();
    default:
      return "";
  }
}

export function serializeEmailBlocks(blocks: EmailBlock[]): string {
  return blocks
    .map(serializeEmailBlock)
    .filter((chunk) => chunk.trim().length > 0)
    .join("\n\n");
}

/* ------------------------------------------------------------------ parser */

const MARKER_SPLIT_RE =
  /(<!--\s*hc-email-(?:btn|product|form):[\s\S]*?-->)/gi;
const BTN_MARKER_RE = /^<!--\s*hc-email-btn:([^|]+)\|([^>]+?)\s*-->$/i;
const PRODUCT_MARKER_RE =
  /^<!--\s*hc-email-product:([0-9a-f-]{36})(?::(site|stripe))?\s*-->$/i;
const FORM_MARKER_RE = /^<!--\s*hc-email-form:([0-9a-f-]{36})\s*-->$/i;
const BLOCK_TAG_RE =
  /<(p|div|br|table|h[1-6]|ul|ol|li|img|tr|td|th|blockquote|a)\b/i;
const LEGACY_IMAGE_RE = /^<p[^>]*>\s*<img\b[^>]*>\s*<\/p>$/i;
const BARE_IMAGE_RE = /^<img\b[^>]*\/?>$/i;

function parseLegacyMarker(chunk: string): EmailBlock | null {
  const button = BTN_MARKER_RE.exec(chunk);
  if (button) {
    try {
      return {
        id: newEmailBlockId(),
        type: "button",
        label: decodeURIComponent(button[1]),
        href: decodeURIComponent(button[2]),
        align: "center",
        variant: "gold",
      };
    } catch {
      return null;
    }
  }
  const product = PRODUCT_MARKER_RE.exec(chunk);
  if (product) {
    return {
      id: newEmailBlockId(),
      type: "product",
      productId: product[1],
      linkMode: normalizeProductLinkMode(product[2]),
    };
  }
  const form = FORM_MARKER_RE.exec(chunk);
  if (form) {
    return { id: newEmailBlockId(), type: "form", formId: form[1] };
  }
  return null;
}

function parseKnownBlock(chunk: string, kind: string): EmailBlock | null {
  const id = newEmailBlockId();
  switch (kind) {
    case "text": {
      const size = attr(chunk, "data-size");
      return {
        id,
        type: "text",
        text: outline(innerHtml(chunk)),
        align: align(attr(chunk, "data-align")),
        size: size === "sm" || size === "lg" ? size : "md",
      };
    }
    case "heading": {
      const level = Number(attr(chunk, "data-level"));
      return {
        id,
        type: "heading",
        text: outline(innerHtml(chunk)),
        level: level === 1 || level === 3 ? level : 2,
        align: align(attr(chunk, "data-align")),
      };
    }
    case "button": {
      const variant = attr(chunk, "data-variant");
      return {
        id,
        type: "button",
        label: attr(chunk, "data-label"),
        href: attr(chunk, "data-href"),
        align: align(attr(chunk, "data-align")),
        variant:
          variant === "green" || variant === "outline" ? variant : "gold",
      };
    }
    case "image":
      return {
        id,
        type: "image",
        src: attr(chunk, "data-src"),
        alt: attr(chunk, "data-alt"),
        href: attr(chunk, "data-href"),
        width: clamp(Number(attr(chunk, "data-width")) || 100, 20, 100),
        align: align(attr(chunk, "data-align")),
        radius: attr(chunk, "data-radius") !== "0",
        caption: attr(chunk, "data-caption"),
      };
    case "columns": {
      const count = clamp(Number(attr(chunk, "data-cols")) || 2, 1, 3);
      const columns: EmailColumn[] = [];
      for (let i = 0; i < count; i += 1) {
        columns.push({
          src: attr(chunk, `data-c${i}-src`),
          alt: attr(chunk, `data-c${i}-alt`),
          text: attr(chunk, `data-c${i}-text`),
          href: attr(chunk, `data-c${i}-href`),
        });
      }
      return { id, type: "columns", columns };
    }
    case "quote": {
      const match = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(chunk);
      return { id, type: "quote", text: outline(match?.[1] ?? "") };
    }
    case "list": {
      const items = [...chunk.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(
        (m) => outline(m[1]),
      );
      return {
        id,
        type: "list",
        items: items.length ? items : [""],
        ordered: attr(chunk, "data-ordered") === "1",
      };
    }
    case "divider":
      return { id, type: "divider" };
    case "spacer":
      return {
        id,
        type: "spacer",
        size: clamp(Number(attr(chunk, "data-size")) || 24, 4, 120),
      };
    default:
      return null;
  }
}

/* --- decomposing hand-written HTML written before the builder existed ---- */

const VOID_TAGS = new Set([
  "img",
  "br",
  "hr",
  "input",
  "meta",
  "link",
  "source",
]);
/** Inner content we can safely turn back into plain text and re-escape. */
const PLAIN_INNER_RE = /^(?:[^<]|<br\s*\/?>)*$/i;
const ONLY_IMAGE_RE = /^\s*(?:<a\b[^>]*>)?\s*<img\b[^>]*>\s*(?:<\/a>)?\s*$/i;

function findClosingTag(html: string, tag: string, from: number): number {
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return -1;
}

/** Split a blob of HTML into its top-level nodes (elements, comments, text). */
function topLevelNodes(html: string): string[] {
  const nodes: string[] = [];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      nodes.push(html.slice(i));
      break;
    }
    if (lt > i) nodes.push(html.slice(i, lt));

    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt);
      if (end < 0) {
        nodes.push(html.slice(lt));
        break;
      }
      nodes.push(html.slice(lt, end + 3));
      i = end + 3;
      continue;
    }

    const orphanClose = /^<\/[a-z0-9]+\s*>/i.exec(html.slice(lt));
    if (orphanClose) {
      nodes.push(orphanClose[0]);
      i = lt + orphanClose[0].length;
      continue;
    }

    const open = /^<([a-z0-9]+)([^>]*)>/i.exec(html.slice(lt));
    if (!open) {
      nodes.push(html.slice(lt));
      break;
    }
    const tag = open[1].toLowerCase();
    const openEnd = lt + open[0].length;
    if (VOID_TAGS.has(tag) || open[2].trim().endsWith("/")) {
      nodes.push(html.slice(lt, openEnd));
      i = openEnd;
      continue;
    }
    const close = findClosingTag(html, tag, openEnd);
    if (close < 0) {
      nodes.push(html.slice(lt));
      break;
    }
    nodes.push(html.slice(lt, close));
    i = close;
  }
  return nodes.filter((node) => node.trim().length > 0);
}

function alignFromStyle(html: string): EmailBlockAlign {
  return align(/text-align:\s*(left|center|right)/i.exec(html)?.[1] ?? "left");
}

/** Styles the builder re-creates on its own, so dropping them changes nothing. */
const REGENERATED_STYLE_RE =
  /^(margin|margin-top|margin-bottom|margin-left|margin-right|line-height|font-family|font-size|text-align)$/i;

/**
 * True when converting the element to a block would not lose styling the
 * author put there by hand — anything else stays a raw HTML block.
 */
function styleIsRegenerated(html: string): boolean {
  const style = /^<[a-z0-9]+\b[^>]*\sstyle="([^"]*)"/i.exec(html)?.[1];
  if (!style) return true;
  return style.split(";").every((declaration) => {
    const [rawProp, ...rest] = declaration.split(":");
    const prop = rawProp.trim().toLowerCase();
    if (!prop) return true;
    if (REGENERATED_STYLE_RE.test(prop)) return true;
    if (prop === "color") {
      return rest.join(":").trim().toLowerCase() === "#1a2e1a";
    }
    return false;
  });
}

function imageBlockFrom(html: string): EmailBlock | null {
  const src = /<img\b[^>]*\ssrc="([^"]*)"/i.exec(html)?.[1] ?? "";
  if (!src) return null;
  const alt = /<img\b[^>]*\salt="([^"]*)"/i.exec(html)?.[1] ?? "";
  const href = /<a\b[^>]*\shref="([^"]*)"/i.exec(html)?.[1] ?? "";
  return {
    id: newEmailBlockId(),
    type: "image",
    src: unesc(src),
    alt: unesc(alt),
    href: unesc(href),
    width: 100,
    align: "center",
    radius: /border-radius/i.test(html),
    caption: "",
  };
}

/**
 * Fragments that render nothing at all — orphan closing tags and empty or
 * never-closed wrappers, which the old append-only editor left behind. They
 * would otherwise show up as puzzling "HTML" blocks in the builder.
 */
const INVISIBLE_NODE_RE =
  /^(?:<\/[a-z0-9]+\s*>|<(?:p|div|span|h[1-6])\b[^>]*>\s*(?:<\/(?:p|div|span|h[1-6])\s*>)?)$/i;

/** Best-effort: turn one legacy node into a real block, or null to keep raw. */
function blockFromLegacyNode(node: string): EmailBlock | null {
  const trimmed = node.trim();

  if (/^<br\s*\/?>$/i.test(trimmed)) return null;

  if (!trimmed.startsWith("<")) {
    return {
      id: newEmailBlockId(),
      type: "text",
      text: unesc(trimmed),
      align: "left",
      size: "md",
    };
  }

  const heading = /^<h([1-6])\b[^>]*>([\s\S]*)<\/h[1-6]>$/i.exec(trimmed);
  if (heading && PLAIN_INNER_RE.test(heading[2]) && styleIsRegenerated(trimmed)) {
    const level = Number(heading[1]);
    return {
      id: newEmailBlockId(),
      type: "heading",
      text: outline(heading[2]),
      level: level <= 1 ? 1 : level === 2 ? 2 : 3,
      align: alignFromStyle(trimmed),
    };
  }

  if (BARE_IMAGE_RE.test(trimmed)) return imageBlockFrom(trimmed);

  const paragraph = /^<p\b[^>]*>([\s\S]*)<\/p>$/i.exec(trimmed);
  if (paragraph) {
    const inner = paragraph[1];
    if (ONLY_IMAGE_RE.test(inner)) return imageBlockFrom(inner);
    if (PLAIN_INNER_RE.test(inner) && styleIsRegenerated(trimmed)) {
      const text = outline(inner);
      if (!text) return null;
      return {
        id: newEmailBlockId(),
        type: "text",
        text,
        align: alignFromStyle(trimmed),
        size: "md",
      };
    }
    return null;
  }

  const list = /^<(ul|ol)\b[^>]*>([\s\S]*)<\/(?:ul|ol)>$/i.exec(trimmed);
  if (list) {
    const items = [...list[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    const allPlain =
      items.length > 0 && items.every((item) => PLAIN_INNER_RE.test(item[1]));
    // Bail out when there is markup between the <li>s we would silently drop.
    const leftover = list[2].replace(/<li\b[^>]*>[\s\S]*?<\/li>/gi, "").trim();
    if (allPlain && !leftover && styleIsRegenerated(trimmed)) {
      return {
        id: newEmailBlockId(),
        type: "list",
        items: items.map((item) => outline(item[1])),
        ordered: list[1].toLowerCase() === "ol",
      };
    }
  }

  return null;
}

function parseChunk(chunk: string): EmailBlock[] {
  const kind = /^<[a-z0-9]+\b[^>]*\sdata-hc="([a-z]+)"/i.exec(chunk);
  if (kind) {
    const known = parseKnownBlock(chunk, kind[1].toLowerCase());
    if (known) return [known];
  }

  // Images inserted by the old "снимка в текста" button.
  if (LEGACY_IMAGE_RE.test(chunk) || BARE_IMAGE_RE.test(chunk)) {
    const image = imageBlockFrom(chunk);
    if (image) return [image];
  }

  if (!BLOCK_TAG_RE.test(chunk)) {
    return [
      {
        id: newEmailBlockId(),
        type: "text",
        text: chunk,
        align: "left",
        size: "md",
      },
    ];
  }

  // Hand-written HTML: break it into editable blocks where that is lossless,
  // and keep whatever we cannot model faithfully as a raw HTML block.
  const nodes = topLevelNodes(chunk);
  if (nodes.length === 0) {
    return [{ id: newEmailBlockId(), type: "html", html: chunk }];
  }

  const blocks: EmailBlock[] = [];
  for (const node of nodes) {
    const raw = node.trim();
    if (!raw || INVISIBLE_NODE_RE.test(raw)) continue;
    const block = blockFromLegacyNode(node);
    blocks.push(block ?? { id: newEmailBlockId(), type: "html", html: raw });
  }
  return blocks;
}

/** Read a stored email body back into editable blocks. */
export function parseEmailBlocks(raw: string): EmailBlock[] {
  const source = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!source) return [];

  const blocks: EmailBlock[] = [];
  for (const part of source.split(MARKER_SPLIT_RE)) {
    if (!part) continue;
    const trimmedPart = part.trim();
    const marker = trimmedPart ? parseLegacyMarker(trimmedPart) : null;
    if (marker) {
      blocks.push(marker);
      continue;
    }
    for (const rawChunk of part.split(/\n{2,}/)) {
      const chunk = rawChunk.trim();
      if (!chunk) continue;
      blocks.push(...parseChunk(chunk));
    }
  }
  return blocks;
}

/* -------------------------------------------------------------- block info */

export const EMAIL_BLOCK_LABELS: Record<EmailBlockType, string> = {
  text: "Текст",
  heading: "Заглавие",
  button: "Бутон",
  image: "Снимка",
  columns: "Две колони",
  quote: "Акцент",
  list: "Списък",
  divider: "Разделител",
  spacer: "Разстояние",
  product: "Продукт",
  form: "Форма",
  html: "HTML",
};

/** Short one-liner shown on the collapsed block card. */
export function emailBlockSummary(block: EmailBlock): string {
  switch (block.type) {
    case "text":
    case "heading":
    case "quote":
      return block.text.trim().replace(/\s+/g, " ") || "Празен блок";
    case "button":
      return block.label.trim()
        ? `${block.label.trim()} → ${block.href.trim() || "без линк"}`
        : "Без текст";
    case "image":
      return block.src.trim()
        ? `${block.width}% · ${block.align === "center" ? "центрирана" : block.align === "right" ? "вдясно" : "вляво"}`
        : "Без снимка";
    case "columns":
      return `${block.columns.length} колони`;
    case "list":
      return block.items.filter((i) => i.trim()).length
        ? block.items.filter((i) => i.trim()).join(" · ")
        : "Празен списък";
    case "spacer":
      return `${block.size} px`;
    case "divider":
      return "Тънка линия";
    case "product":
      return block.productId ? "Продуктова карта" : "Не е избран продукт";
    case "form":
      return block.formId ? "Карта с форма" : "Не е избрана форма";
    case "html":
      return block.html.trim().slice(0, 80) || "Празен HTML";
    default:
      return "";
  }
}

/* ---------------------------------------------------------- list utilities */

export function moveEmailBlock(
  blocks: EmailBlock[],
  from: number,
  to: number,
): EmailBlock[] {
  if (from === to || from < 0 || from >= blocks.length) return blocks;
  const target = clamp(to, 0, blocks.length - 1);
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

export function duplicateEmailBlock(block: EmailBlock): EmailBlock {
  if (block.type === "columns") {
    return {
      ...block,
      id: newEmailBlockId(),
      columns: block.columns.map((col) => ({ ...col })),
    };
  }
  if (block.type === "list") {
    return { ...block, id: newEmailBlockId(), items: [...block.items] };
  }
  return { ...block, id: newEmailBlockId() };
}
