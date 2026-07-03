import type { EmailFooterConfig, Locale } from "@/lib/supabase/types";

const COLORS = {
  textPrimary: "#1A2E1A",
  textMuted: "#5A7A5A",
  divider: "#E0E0E0",
  iconBg: "#1A1A1A",
} as const;

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

function link(href: string, label: string, style: string): string {
  if (!href.trim() || !isSafeHref(href)) return escapeHtml(label);
  return `<a href="${escapeHtml(href.trim())}" target="_blank" rel="noopener noreferrer" style="${style}">${escapeHtml(label)}</a>`;
}

function socialIcon(href: string | null, letter: string, title: string): string {
  if (!href?.trim() || !isSafeHref(href)) return "";
  return `
    <td style="padding-right:8px">
      <a href="${escapeHtml(href.trim())}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}" style="display:inline-block;width:28px;height:28px;border-radius:50%;background-color:${COLORS.iconBg};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;line-height:28px;text-align:center;text-decoration:none">
        ${letter}
      </a>
    </td>`;
}

function signatureBlock(config: EmailFooterConfig): string {
  if (!config.signature_enabled) return "";

  const imageCell = config.signature_image_url?.trim()
    ? `
    <td valign="top" style="padding-right:16px;width:72px">
      <img src="${escapeHtml(config.signature_image_url.trim())}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:50%;object-fit:cover;border:0" />
    </td>`
    : "";

  const emailLine = config.signature_email.trim()
    ? `<p style="margin:6px 0 0;font-size:13px;color:${COLORS.textPrimary};line-height:1.5">
        <span style="color:${COLORS.textMuted}">✉</span>
        ${link(`mailto:${config.signature_email.trim()}`, config.signature_email.trim(), `color:${COLORS.textPrimary};text-decoration:none`)}
      </p>`
    : "";

  const phoneLine = config.signature_phone.trim()
    ? `<p style="margin:4px 0 0;font-size:13px;color:${COLORS.textPrimary};line-height:1.5">
        <span style="color:${COLORS.textMuted}">☎</span>
        ${escapeHtml(config.signature_phone.trim())}
      </p>`
    : "";

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px">
  <tr>
    ${imageCell}
    <td valign="top" style="font-family:Arial,Helvetica,sans-serif">
      ${config.signature_closing.trim() ? `<p style="margin:0 0 6px;font-size:14px;color:${COLORS.textPrimary};line-height:1.5">${escapeHtml(config.signature_closing.trim())}</p>` : ""}
      ${config.signature_name.trim() ? `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${COLORS.textPrimary};line-height:1.4">${escapeHtml(config.signature_name.trim())}</p>` : ""}
      ${config.signature_title.trim() ? `<p style="margin:0;font-size:12px;color:${COLORS.textMuted};line-height:1.45">${escapeHtml(config.signature_title.trim())}</p>` : ""}
      ${emailLine}
      ${phoneLine}
    </td>
  </tr>
</table>`;
}

function footerLinks(locale: Locale, unsubscribeHref: string | null, preferencesUrl: string | null): string {
  const unsubscribeLabel = locale === "en" ? "Unsubscribe" : "Отписване";
  const preferencesLabel = locale === "en" ? "Update preferences" : "Настройки";

  const links: string[] = [];
  if (unsubscribeHref?.trim() && isSafeHref(unsubscribeHref)) {
    links.push(
      `<a href="${escapeHtml(unsubscribeHref.trim())}" style="color:${COLORS.textPrimary};font-size:12px;text-decoration:underline">${unsubscribeLabel}</a>`,
    );
  }
  if (preferencesUrl?.trim() && isSafeHref(preferencesUrl)) {
    links.push(
      `<a href="${escapeHtml(preferencesUrl.trim())}" style="color:${COLORS.textPrimary};font-size:12px;text-decoration:underline">${preferencesLabel}</a>`,
    );
  }
  if (!links.length) return "";

  return links
    .map(
      (l) =>
        `<p style="margin:0 0 6px;text-align:right;line-height:1.4">${l}</p>`,
    )
    .join("");
}

export function renderEmailSignatureAndFooter(
  config: EmailFooterConfig,
  locale: Locale,
  unsubscribeHref?: string | null,
): string {
  const brandColor = config.brand_color?.trim() || "#2563eb";
  const signature = signatureBlock(config);
  const fb = socialIcon(config.facebook_url, "f", "Facebook");
  const yt = socialIcon(config.youtube_url, "▶", "YouTube");
  const socialRow =
    fb || yt
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:12px"><tr>${fb}${yt}</tr></table>`
      : "";

  const websiteDisplay = config.website_url.trim().replace(/^https?:\/\//i, "");
  const websiteLink = config.website_url.trim()
    ? link(
        config.website_url.trim(),
        websiteDisplay,
        `color:${brandColor};font-size:13px;text-decoration:underline`,
      )
    : "";

  const prefsUrl = config.preferences_url?.trim() || null;
  const actionLinks = footerLinks(locale, unsubscribeHref ?? null, prefsUrl);

  return `
${signature}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:${signature ? "20px" : "0"}">
  <tr>
    <td style="border-top:1px solid ${COLORS.divider};font-size:0;line-height:0;height:1px">&nbsp;</td>
  </tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px">
  <tr>
    <td valign="top" width="50%" style="font-family:Arial,Helvetica,sans-serif;padding-right:12px">
      ${config.brand_name.trim() ? `<p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${escapeHtml(brandColor)};line-height:1.3">${escapeHtml(config.brand_name.trim())}</p>` : ""}
      ${websiteLink ? `<p style="margin:0 0 8px;line-height:1.4">${websiteLink}</p>` : ""}
      ${config.footer_email.trim() ? `<p style="margin:0 0 4px;font-size:12px;color:${COLORS.textPrimary};line-height:1.5">${escapeHtml(config.footer_email.trim())}</p>` : ""}
      ${config.footer_phone.trim() ? `<p style="margin:0 0 4px;font-size:12px;color:${COLORS.textPrimary};line-height:1.5">${escapeHtml(config.footer_phone.trim())}</p>` : ""}
      ${config.address_line1.trim() ? `<p style="margin:0;font-size:12px;color:${COLORS.textPrimary};line-height:1.5">${escapeHtml(config.address_line1.trim())}</p>` : ""}
      ${config.address_line2.trim() ? `<p style="margin:0;font-size:12px;color:${COLORS.textPrimary};line-height:1.5">${escapeHtml(config.address_line2.trim())}</p>` : ""}
      ${socialRow}
    </td>
    <td valign="top" width="50%" style="font-family:Arial,Helvetica,sans-serif;padding-left:12px">
      ${config.disclaimer.trim() ? `<p style="margin:0 0 12px;font-size:11px;color:${COLORS.textMuted};line-height:1.55;text-align:left">${escapeHtml(config.disclaimer.trim())}</p>` : ""}
      ${actionLinks}
    </td>
  </tr>
</table>`;
}
