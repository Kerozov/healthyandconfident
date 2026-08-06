import { expandEmailBodyButtons } from "@/lib/email/body-buttons";

const BLOCK_TAG_RE = /<(p|div|br|table|h[1-6]|ul|ol|li|img|tr|td|th|blockquote)\b/i;
const MARKER_RE = /<!--[\s\S]*?-->/g;
const STARTS_WITH_BLOCK_RE = /^<(p|div|table|h[1-6]|ul|ol|blockquote)\b/i;

/**
 * Turn plain-text newlines into email-safe HTML paragraphs / <br>,
 * while preserving existing HTML and <!-- markers -->.
 * Also expands inline body-button markers.
 */
export function normalizeEmailBodyHtml(raw: string): string {
  const trimmed = raw.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return "";

  const markers: string[] = [];
  const withPlaceholders = trimmed.replace(MARKER_RE, (m) => {
    const i = markers.length;
    markers.push(m);
    return `\uE000${i}\uE001`;
  });

  let html: string;
  if (BLOCK_TAG_RE.test(withPlaceholders)) {
    // Already HTML — still honor bare newlines between chunks.
    html = withPlaceholders
      .split(/\n{2,}/)
      .map((chunk) => {
        const piece = chunk.trim();
        if (!piece) return "";
        if (BLOCK_TAG_RE.test(piece) || /^\uE000\d+\uE001$/.test(piece)) {
          // A chunk that opens with a block-level tag is real markup: turning
          // its newlines into <br> injects stray breaks between table rows.
          // Only mixed text + inline HTML still needs the conversion.
          return STARTS_WITH_BLOCK_RE.test(piece)
            ? piece
            : piece.replace(/\n/g, "<br>\n");
        }
        return `<p style="margin:0 0 16px;line-height:1.65;color:#1A2E1A">${piece.replace(/\n/g, "<br>")}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  } else {
    html = withPlaceholders
      .split(/\n{2,}/)
      .map((para) => {
        const text = para.trim();
        if (!text) return "";
        return `<p style="margin:0 0 16px;line-height:1.65;color:#1A2E1A">${text.replace(/\n/g, "<br>")}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }

  html = html.replace(/\uE000(\d+)\uE001/g, (_, i) => markers[Number(i)] ?? "");
  return expandEmailBodyButtons(html);
}
