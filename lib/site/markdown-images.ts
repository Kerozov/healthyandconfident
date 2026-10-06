/**
 * How a picture in a post is placed: its Markdown title, the same trick the
 * buttons use (`lib/site/markdown-links.ts`). `![alt](url "right")` floats it
 * right with the text flowing beside it, `![alt](url "left|Надпис")` floats it
 * left with a caption underneath. Several pictures in one paragraph are drawn
 * as a gallery row. The Bulgarian words are accepted too.
 */
export type ImageLayout = "full" | "center" | "left" | "right";

export const IMAGE_LAYOUTS: ImageLayout[] = ["full", "center", "left", "right"];

const LAYOUT_WORDS: Record<string, ImageLayout> = {
  full: "full",
  цяла: "full",
  center: "center",
  small: "center",
  център: "center",
  малка: "center",
  left: "left",
  ляво: "left",
  вляво: "left",
  right: "right",
  дясно: "right",
  вдясно: "right",
};

/**
 * `"right|Надпис"` → right, with a caption. A title that names no layout is
 * all caption, so a hand-written `![…](url "Some words")` still shows them.
 */
export function parseImageTitle(title: string | null | undefined): {
  layout: ImageLayout;
  caption: string;
} {
  const raw = (title ?? "").trim();
  if (!raw) return { layout: "full", caption: "" };
  const bar = raw.indexOf("|");
  const head = (bar >= 0 ? raw.slice(0, bar) : raw).trim().toLowerCase();
  const layout = LAYOUT_WORDS[head];
  if (!layout) return { layout: "full", caption: raw };
  return { layout, caption: bar >= 0 ? raw.slice(bar + 1).trim() : "" };
}

/** The inverse of the above. A caption always gets its layout in front, so a caption of "right" can't turn into a layout. */
export function formatImageTitle(layout: ImageLayout, caption: string): string {
  const text = caption.replace(/\s+/g, " ").trim();
  if (!text) return layout === "full" ? "" : layout;
  return `${layout}|${text}`;
}

/** Only web and site-relative addresses end up in an `<img>`. */
export function safeImageSrc(src: string | null | undefined): string {
  const value = (src ?? "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "";
}
