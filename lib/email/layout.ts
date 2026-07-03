import { siteConfig } from "@/lib/site";
import { DEFAULT_EMAIL_FOOTER } from "@/lib/email/footer-defaults";
import { renderEmailSignatureAndFooter } from "@/lib/email/footer-html";
import type { EmailFooterConfig } from "@/lib/supabase/types";

export type EmailCta = {
  label: string;
  href: string;
};

export type ComposeEmailOptions = {
  bodyHtml: string;
  locale?: "bg" | "en";
  cta?: EmailCta | null;
  unsubscribeHref?: string | null;
  footerConfig?: EmailFooterConfig | null;
};

const COLORS = {
  bgPrimary: "#F7FBF7",
  bgCard: "#FFFFFF",
  green: "#2D7A47",
  greenDark: "#1F5C34",
  gold: "#F0B429",
  goldDark: "#D99B0F",
  textPrimary: "#1A2E1A",
  textMuted: "#5A7A5A",
  footerBg: "#EEF7EE",
} as const;

const MARKER = "<!-- hc-email-template -->";

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

function headerSubtitle(locale: "bg" | "en"): string {
  return locale === "en" ? "Holistic Nutritionist" : "Холистичен диетолог";
}

function ctaBlock(cta: EmailCta): string {
  if (!cta.label.trim() || !cta.href.trim() || !isSafeHref(cta.href)) {
    return "";
  }
  const label = escapeHtml(cta.label.trim());
  const href = escapeHtml(cta.href.trim());
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px">
  <tr>
    <td align="center">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:${COLORS.gold};color:${COLORS.textPrimary};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;mso-padding-alt:0">
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
        <span style="mso-text-raise:15pt">${label}</span>
        <!--[if mso]><i style="letter-spacing:32px;mso-font-width:-100%">&nbsp;</i><![endif]-->
      </a>
    </td>
  </tr>
</table>`;
}

function resolveFooterConfig(
  locale: "bg" | "en",
  footerConfig?: EmailFooterConfig | null,
): EmailFooterConfig {
  if (footerConfig) return footerConfig;
  const defaults = DEFAULT_EMAIL_FOOTER[locale];
  return { id: "", updated_at: "", ...defaults };
}

/** Full branded HTML email — header, body, optional CTA, footer. */
export function composeBrandedEmail(options: ComposeEmailOptions): string {
  const { bodyHtml, locale = "bg", cta, unsubscribeHref, footerConfig } = options;

  if (bodyHtml.includes(MARKER)) {
    return bodyHtml;
  }

  const year = new Date().getFullYear();
  const subtitle = headerSubtitle(locale);
  const button = cta ? ctaBlock(cta) : "";
  const footer = resolveFooterConfig(locale, footerConfig);
  const signatureFooter = renderEmailSignatureAndFooter(
    footer,
    locale,
    unsubscribeHref,
  );

  return `<!DOCTYPE html>
<html lang="${locale === "en" ? "en" : "bg"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(siteConfig.brand)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bgPrimary};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
${MARKER}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${COLORS.bgPrimary}">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:${COLORS.bgCard};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(61,43,31,0.08)">
        <tr>
          <td style="background-color:${COLORS.green};padding:36px 28px;text-align:center">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#ffffff;line-height:1.2">
              ${escapeHtml(siteConfig.brand)}
            </p>
            <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.9);line-height:1.4">
              ${escapeHtml(siteConfig.tagline)}
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.4">
              ${escapeHtml(subtitle)}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px;color:${COLORS.textPrimary};font-size:16px;line-height:1.65">
            ${bodyHtml}
            ${button}
          </td>
        </tr>
        <tr>
          <td style="background-color:${COLORS.footerBg};padding:24px 28px;border-top:1px solid rgba(155,123,106,0.15)">
            ${signatureFooter}
            <p style="margin:20px 0 0;font-size:11px;color:${COLORS.textMuted};line-height:1.5;text-align:center">
              © ${year} ${escapeHtml(siteConfig.brand)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
