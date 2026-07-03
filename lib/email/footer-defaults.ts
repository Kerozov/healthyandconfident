import type { EmailFooterConfig, Locale } from "@/lib/supabase/types";

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
    brand_name: "Healthy and Confident",
    brand_color: "#2563eb",
    website_url: "https://www.healthyandconfident.co.uk/bg",
    footer_email: "vessie@healthyandconfident.co.uk",
    footer_phone: "M: 0044 7876 565 263",
    address_line1: "Фарнбъро",
    address_line2: "Обединеното кралство",
    facebook_url: null,
    youtube_url: null,
    disclaimer:
      "Получихте този имейл, защото сте се регистрирали на наша платформа или сте участвали в наше обучение или програма.",
    preferences_url: null,
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
    brand_name: "Healthy and Confident",
    brand_color: "#2563eb",
    website_url: "https://www.healthyandconfident.co.uk/en",
    footer_email: "vessie@healthyandconfident.co.uk",
    footer_phone: "M: 0044 7876 565 263",
    address_line1: "Farnborough",
    address_line2: "United Kingdom",
    facebook_url: null,
    youtube_url: null,
    disclaimer:
      "You received this email because you registered on our platform or took part in one of our trainings or programmes.",
    preferences_url: null,
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
  };
}
