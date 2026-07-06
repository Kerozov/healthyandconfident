import type { FormTemplateRecord } from "@/lib/forms/types";

const FORM_MARKER_RE =
  /<!--\s*hc-email-form:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*-->/gi;

export function formEmailMarker(formId: string): string {
  return `\n<!-- hc-email-form:${formId} -->\n`;
}

export function extractFormIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(new RegExp(FORM_MARKER_RE.source, "gi"))) {
    if (match[1]) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailFormCard(
  form: Pick<
    FormTemplateRecord,
    "title_bg" | "title_en" | "description_bg" | "description_en"
  >,
  locale: "bg" | "en",
  href: string,
): string {
  const title = locale === "en" ? form.title_en : form.title_bg;
  const description =
    locale === "en" ? form.description_en : form.description_bg;
  const cta = locale === "en" ? "Open form" : "Попълни формата";

  if (!href.trim()) return "";

  const descriptionBlock = description.trim()
    ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.55;color:#5A7A5A">${escapeHtml(description.trim())}</p>`
    : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border:1px solid rgba(45,122,71,0.18);border-radius:14px;overflow:hidden;background-color:#FAF8F3">
<tr>
  <td style="padding:20px 22px">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7D8461">📋 ${locale === "en" ? "Form" : "Форма"}</p>
    <h2 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#1A2E1A;line-height:1.3">${escapeHtml(title.trim() || (locale === "en" ? "Questionnaire" : "Въпросник"))}</h2>
    ${descriptionBlock}
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px">
      <tr>
        <td style="border-radius:10px;background-color:#2D5016">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none">${escapeHtml(cta)}</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>`;
}

export function expandEmailFormMarkers(
  html: string,
  formsById: Map<string, FormTemplateRecord>,
  locale: "bg" | "en",
  hrefByFormId: Map<string, string>,
): string {
  return html.replace(new RegExp(FORM_MARKER_RE.source, "gi"), (_match, id: string) => {
    const form = formsById.get(id.toLowerCase());
    if (!form) return "";
    const href = hrefByFormId.get(id.toLowerCase()) ?? "";
    return renderEmailFormCard(form, locale, href);
  });
}
