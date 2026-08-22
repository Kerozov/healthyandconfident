import type { EmailFooterConfig, Locale } from "@/lib/supabase/types";
import { publicSiteOrigin } from "@/lib/site";
import { parseSignatureLinks } from "@/lib/email/signature-links";

const site = publicSiteOrigin();

const HEADER_DEFAULTS = {
  header_enabled: true,
  header_title: "Vessie Nay",
  header_tagline: "Healthy & Confident",
  header_image_url: null as string | null,
  header_image_full_width: false,
  header_bg_color: "#2D7A47",
  copyright_enabled: true,
} as const;

export const DEFAULT_EMAIL_FOOTER: Record<Locale, Omit<EmailFooterConfig, "id" | "updated_at">> = {
  bg: {
    locale: "bg",
    signature_enabled: true,
    signature_image_url: null,
    signature_closing: "❤️ С обич и подкрепа,",
    signature_name: "Веси",
    signature_title:
      "Холистичен Диетолог B.Med.Sc. (Hons) & СПРАВЯНЕ с Инсулинова резистентност и Диабет 2",
    signature_email: "vessie@healthyandconfident.co.uk",
    signature_phone: "00 44 7876 565 263",
    signature_links: [],
    brand_name: "Healthy and Confident",
    brand_color: "#2563eb",
    website_url: `${site}/bg`,
    footer_email: "vessie@healthyandconfident.co.uk",
    footer_phone: "M: 0044 7876 565 263",
    address_line1: "Фарнбъро",
    address_line2: "Обединеното кралство",
    facebook_url: null,
    youtube_url: null,
    disclaimer:
      "Получихте този имейл, защото сте се регистрирали на наша платформа или сте участвали в наше обучение или програма.",
    preferences_url: null,
    ...HEADER_DEFAULTS,
    header_subtitle: "Холистичен диетолог",
  },
  en: {
    locale: "en",
    signature_enabled: true,
    signature_image_url: null,
    signature_closing: "With love and support,",
    signature_name: "Vesi",
    signature_title:
      "Holistic Dietitian B.Med.Sc. (Hons) — insulin resistance & type 2 diabetes",
    signature_email: "vessie@healthyandconfident.co.uk",
    signature_phone: "00 44 7876 565 263",
    signature_links: [],
    brand_name: "Healthy and Confident",
    brand_color: "#2563eb",
    website_url: `${site}/en`,
    footer_email: "vessie@healthyandconfident.co.uk",
    footer_phone: "M: 0044 7876 565 263",
    address_line1: "Farnborough",
    address_line2: "United Kingdom",
    facebook_url: null,
    youtube_url: null,
    disclaimer:
      "You received this email because you registered on our platform or took part in one of our trainings or programmes.",
    preferences_url: null,
    ...HEADER_DEFAULTS,
    header_subtitle: "Holistic Nutritionist",
  },
};

export function footerConfigFromRow(
  row: EmailFooterConfig | null,
  locale: Locale,
): EmailFooterConfig {
  const defaults = DEFAULT_EMAIL_FOOTER[locale];
  if (!row) {
    return {
      id: "",
      updated_at: "",
      ...defaults,
    };
  }
  return {
    ...defaults,
    ...row,
    locale,
    header_enabled: row.header_enabled ?? defaults.header_enabled,
    header_title: row.header_title || defaults.header_title,
    header_tagline: row.header_tagline || defaults.header_tagline,
    header_subtitle: row.header_subtitle || defaults.header_subtitle,
    header_image_url: row.header_image_url ?? defaults.header_image_url,
    header_image_full_width:
      row.header_image_full_width ?? defaults.header_image_full_width,
    header_bg_color: row.header_bg_color || defaults.header_bg_color,
    copyright_enabled: row.copyright_enabled ?? defaults.copyright_enabled,
    signature_links: parseSignatureLinks(row.signature_links),
  };
}
