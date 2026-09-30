import {
  formatImageTitle,
  parseImageTitle,
  type ImageLayout,
} from "@/lib/site/markdown-images";

/**
 * A blog post as the editor sees it: text and pictures in the order they
 * appear. It is still saved as plain Markdown in `blog_posts.content` — a
 * picture is just a paragraph holding only `![…](…)` — so old posts open as
 * blocks and the site keeps rendering one Markdown string.
 */
export type PostImage = {
  src: string;
  alt: string;
  caption: string;
  /** Where a click on the picture goes (a YouTube video, a programme…). */
  href: string;
};

export type PostBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; image: PostImage; layout: ImageLayout }
  | { id: string; type: "gallery"; images: PostImage[] };

export type PostBlockType = PostBlock["type"];

export const POST_BLOCK_LABELS: Record<PostBlockType, string> = {
  text: "Текст",
  image: "Снимка",
  gallery: "Галерия",
};

let idCounter = 0;

function newPostBlockId(): string {
  idCounter += 1;
  return `pb-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyPostImage(src = ""): PostImage {
  return { src, alt: "", caption: "", href: "" };
}

export function createPostBlock(type: PostBlockType): PostBlock {
  const id = newPostBlockId();
  if (type === "image") {
    return { id, type, image: emptyPostImage(), layout: "full" };
  }
  if (type === "gallery") return { id, type, images: [] };
  return { id, type, text: "" };
}

export function movePostBlock(
  blocks: PostBlock[],
  from: number,
  to: number,
): PostBlock[] {
  if (from === to || from < 0 || from >= blocks.length) return blocks;
  const target = Math.min(Math.max(to, 0), blocks.length - 1);
  const next = [...blocks];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/* ------------------------------------------------------------------ parse */

const IMAGE = String.raw`!\[((?:[^\]\\]|\\.)*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*\)`;
const LINK_TARGET = String.raw`(<[^>]*>|[^\s)]+)`;
/** A picture, optionally wrapped in a link: `[![alt](src "title")](href)`. */
const PICTURE = new RegExp(
  String.raw`\[\s*${IMAGE}\s*\]\(\s*${LINK_TARGET}\s*\)|${IMAGE}`,
  "g",
);

function unescape(text: string | undefined): string {
  return (text ?? "").replace(/\\(.)/g, "$1");
}

function unwrap(url: string | undefined): string {
  return (url ?? "").replace(/^<|>$/g, "").trim();
}

type RawPicture = PostImage & { title: string };

/** The pictures a paragraph is made of, or null when it has anything else in it. */
function picturesOnly(chunk: string): RawPicture[] | null {
  // Indented means it belongs to a list item or a code block above it.
  if (chunk !== chunk.trimStart()) return null;
  if (chunk.replace(PICTURE, "").trim()) return null;

  const pictures: RawPicture[] = [];
  for (const m of chunk.matchAll(PICTURE)) {
    const linked = m[2] !== undefined;
    pictures.push({
      alt: unescape(linked ? m[1] : m[5]),
      src: unwrap(linked ? m[2] : m[6]),
      title: unescape(linked ? m[3] : m[7]),
      href: linked ? unwrap(m[4]) : "",
      caption: "",
    });
  }
  return pictures.length > 0 ? pictures : null;
}

/** Paragraphs, split on blank lines — but never inside a ``` code fence. */
function splitChunks(markdown: string): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && !line.trim()) {
      if (current.length) chunks.push(current.join("\n"));
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

export function parsePostBlocks(markdown: string): PostBlock[] {
  const blocks: PostBlock[] = [];
  let text: string[] = [];

  function flushText() {
    if (!text.length) return;
    blocks.push({ id: newPostBlockId(), type: "text", text: text.join("\n\n") });
    text = [];
  }

  for (const chunk of splitChunks(markdown)) {
    const pictures = picturesOnly(chunk);
    if (!pictures) {
      text.push(chunk);
      continue;
    }

    flushText();
    const images = pictures.map(({ title, ...image }) => ({
      ...image,
      caption: parseImageTitle(title).caption,
    }));
    if (images.length === 1) {
      blocks.push({
        id: newPostBlockId(),
        type: "image",
        image: images[0],
        layout: parseImageTitle(pictures[0].title).layout,
      });
    } else {
      blocks.push({ id: newPostBlockId(), type: "gallery", images });
    }
  }
  flushText();

  return blocks;
}

/* -------------------------------------------------------------- serialize */

/** Characters that would end a Markdown URL early are percent-encoded. */
function safeUrl(url: string): string {
  return url.trim().replace(/[\s()<>]/g, (c) => encodeURIComponent(c));
}

function pictureMarkdown(image: PostImage, layout: ImageLayout): string {
  const alt = (image.alt.trim() || image.caption.trim())
    .replace(/\s+/g, " ")
    .replace(/[\\[\]]/g, "\\$&");
  const title = formatImageTitle(layout, image.caption);
  const quoted = title ? ` "${title.replace(/[\\"]/g, "\\$&")}"` : "";
  const md = `![${alt}](${safeUrl(image.src)}${quoted})`;
  return image.href.trim() ? `[${md}](${safeUrl(image.href)})` : md;
}

function blockMarkdown(block: PostBlock): string {
  if (block.type === "text") return block.text.replace(/^\n+|\s+$/g, "");
  if (block.type === "image") {
    return block.image.src.trim() ? pictureMarkdown(block.image, block.layout) : "";
  }
  return block.images
    .filter((image) => image.src.trim())
    .map((image) => pictureMarkdown(image, "full"))
    .join(" ");
}

/** Empty blocks (a picture not uploaded yet, blank text) are left out. */
export function serializePostBlocks(blocks: PostBlock[]): string {
  return blocks.map(blockMarkdown).filter(Boolean).join("\n\n");
}

export function isEmptyPostBlock(block: PostBlock): boolean {
  return !blockMarkdown(block);
}
