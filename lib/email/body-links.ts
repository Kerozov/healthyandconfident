import { parseEmailBodyButtons } from "@/lib/email/body-buttons";

/** A button or link the reader can click inside the email body. */
export type EmailBodyLink = { label: string; href: string; kind: "button" | "link" };

function unesc(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string {
  const match = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag);
  return match ? unesc(match[1]).trim() : "";
}

function plainText(html: string): string {
  return unesc(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * The buttons written into an email's body, so the admin can show what the
 * reader clicks. Campaigns made with the block editor carry their button in
 * the body, not in the separate bottom button, and the admin used to show an
 * empty "button" box for them. With no button, the plain links are returned.
 */
export function emailBodyLinks(html: string | null | undefined): EmailBodyLink[] {
  const source = html ?? "";
  const seen = new Set<string>();
  const out: EmailBodyLink[] = [];
  const add = (label: string, href: string, kind: EmailBodyLink["kind"]) => {
    if (!href || href.startsWith("{{")) return;
    const key = `${label}\u0000${href}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, href, kind });
  };

  for (const tag of source.match(/<table\b[^>]*\sdata-hc="button"[^>]*>/gi) ?? []) {
    add(attr(tag, "data-label"), attr(tag, "data-href"), "button");
  }
  for (const button of parseEmailBodyButtons(source)) {
    add(button.label.trim(), button.href.trim(), "button");
  }
  if (out.length) return out;

  const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchor.exec(source)) !== null) {
    const href = attr(match[1], "href");
    if (/^(mailto:|tel:|#)/i.test(href)) continue;
    add(plainText(match[2]), href, "link");
  }
  return out;
}
