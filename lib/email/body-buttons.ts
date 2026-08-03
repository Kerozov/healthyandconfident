/** Inline email CTA markers — inserted via admin toolbar, expanded at send/preview. */

export type EmailBodyButton = {
  label: string;
  href: string;
  /** Full marker string including comment wrappers */
  marker: string;
  index: number;
};

const BUTTON_RE =
  /<!--\s*hc-email-btn:([^|]+)\|([^>]+?)\s*-->/gi;

export function makeEmailButtonMarker(label: string, href: string): string {
  return `<!-- hc-email-btn:${encodeURIComponent(label.trim())}|${encodeURIComponent(href.trim())} -->`;
}

export function parseEmailBodyButtons(html: string): EmailBodyButton[] {
  const buttons: EmailBodyButton[] = [];
  const re = new RegExp(BUTTON_RE.source, "gi");
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(html)) !== null) {
    try {
      buttons.push({
        label: decodeURIComponent(match[1]),
        href: decodeURIComponent(match[2]),
        marker: match[0],
        index,
      });
      index += 1;
    } catch {
      // skip malformed
    }
  }
  return buttons;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  return false;
}

function buttonHtml(label: string, href: string): string {
  if (!label.trim() || !href.trim() || !isSafeHref(href)) return "";
  const safeLabel = escapeHtml(label.trim());
  const safeHref = escapeHtml(href.trim());
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0">
  <tr>
    <td align="center">
      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#F0B429;color:#1A2E1A;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`;
}

/** Replace button markers with styled HTML buttons. */
export function expandEmailBodyButtons(html: string): string {
  return html.replace(BUTTON_RE, (_full, encLabel: string, encHref: string) => {
    try {
      const label = decodeURIComponent(encLabel);
      const href = decodeURIComponent(encHref);
      return buttonHtml(label, href);
    } catch {
      return "";
    }
  });
}

/** Move a body button up (-1) or down (+1) within the HTML string. */
export function moveEmailBodyButton(
  html: string,
  buttonIndex: number,
  direction: -1 | 1,
): string {
  const buttons = parseEmailBodyButtons(html);
  const otherIndex = buttonIndex + direction;
  if (
    buttonIndex < 0 ||
    otherIndex < 0 ||
    buttonIndex >= buttons.length ||
    otherIndex >= buttons.length
  ) {
    return html;
  }

  const a = buttons[buttonIndex].marker;
  const b = buttons[otherIndex].marker;
  const first = html.indexOf(a);
  const second = html.indexOf(b);
  if (first < 0 || second < 0) return html;

  if (first < second) {
    return (
      html.slice(0, first) +
      b +
      html.slice(first + a.length, second) +
      a +
      html.slice(second + b.length)
    );
  }
  return (
    html.slice(0, second) +
    a +
    html.slice(second + b.length, first) +
    b +
    html.slice(first + a.length)
  );
}

export function removeEmailBodyButton(html: string, buttonIndex: number): string {
  const buttons = parseEmailBodyButtons(html);
  const target = buttons[buttonIndex];
  if (!target) return html;
  return html.replace(target.marker, "").replace(/\n{3,}/g, "\n\n");
}

export function insertAtCursor(
  value: string,
  insert: string,
  start: number,
  end: number,
): { value: string; caret: number } {
  const next = value.slice(0, start) + insert + value.slice(end);
  return { value: next, caret: start + insert.length };
}
