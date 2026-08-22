"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, Check } from "lucide-react";
import type { EmailFooterConfig, SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { saveEmailFooter } from "@/app/(admin)/admin/actions";
import { composeBrandedEmail } from "@/lib/email/layout";
import { footerConfigFromRow } from "@/lib/email/footer-defaults";
import { Field, Input, Textarea, Card } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SignatureLinksEditor } from "@/components/admin/signature-links-editor";
import {
  parseSignatureLinks,
  serializeSignatureLinks,
  type EmailSignatureLink,
} from "@/lib/email/signature-links";

type FormState = {
  header_enabled: boolean;
  header_title: string;
  header_tagline: string;
  header_subtitle: string;
  header_image_url: string;
  header_image_full_width: boolean;
  header_bg_color: string;
  copyright_enabled: boolean;
  signature_enabled: boolean;
  signature_image_url: string;
  signature_closing: string;
  signature_name: string;
  signature_title: string;
  signature_email: string;
  signature_phone: string;
  signature_links: EmailSignatureLink[];
  brand_name: string;
  brand_color: string;
  website_url: string;
  footer_email: string;
  footer_phone: string;
  address_line1: string;
  address_line2: string;
  facebook_url: string;
  youtube_url: string;
  disclaimer: string;
  preferences_url: string;
};

function toForm(config: EmailFooterConfig): FormState {
  return {
    header_enabled: config.header_enabled !== false,
    header_title: config.header_title ?? "",
    header_tagline: config.header_tagline ?? "",
    header_subtitle: config.header_subtitle ?? "",
    header_image_url: config.header_image_url ?? "",
    header_image_full_width: Boolean(config.header_image_full_width),
    header_bg_color: config.header_bg_color || "#2D7A47",
    copyright_enabled: config.copyright_enabled !== false,
    signature_enabled: config.signature_enabled,
    signature_image_url: config.signature_image_url ?? "",
    signature_closing: config.signature_closing,
    signature_name: config.signature_name,
    signature_title: config.signature_title,
    signature_email: config.signature_email,
    signature_phone: config.signature_phone,
    signature_links: parseSignatureLinks(config.signature_links),
    brand_name: config.brand_name,
    brand_color: config.brand_color,
    website_url: config.website_url,
    footer_email: config.footer_email,
    footer_phone: config.footer_phone,
    address_line1: config.address_line1,
    address_line2: config.address_line2,
    facebook_url: config.facebook_url ?? "",
    youtube_url: config.youtube_url ?? "",
    disclaimer: config.disclaimer,
    preferences_url: config.preferences_url ?? "",
  };
}

function toConfig(
  locale: "bg" | "en",
  form: FormState,
  products: SiteProduct[],
  forms: FormTemplateRecord[],
): EmailFooterConfig {
  const base = footerConfigFromRow(null, locale);
  return {
    ...base,
    header_enabled: form.header_enabled,
    header_title: form.header_title,
    header_tagline: form.header_tagline,
    header_subtitle: form.header_subtitle,
    header_image_url: form.header_image_url.trim() || null,
    header_image_full_width: form.header_image_full_width,
    header_bg_color: form.header_bg_color || "#2D7A47",
    copyright_enabled: form.copyright_enabled,
    signature_enabled: form.signature_enabled,
    signature_image_url: form.signature_image_url.trim() || null,
    signature_closing: form.signature_closing,
    signature_name: form.signature_name,
    signature_title: form.signature_title,
    signature_email: form.signature_email,
    signature_phone: form.signature_phone,
    signature_links: serializeSignatureLinks(form.signature_links, locale, {
      products,
      forms,
    }),
    brand_name: form.brand_name,
    brand_color: form.brand_color,
    website_url: form.website_url,
    footer_email: form.footer_email,
    footer_phone: form.footer_phone,
    address_line1: form.address_line1,
    address_line2: form.address_line2,
    facebook_url: form.facebook_url.trim() || null,
    youtube_url: form.youtube_url.trim() || null,
    disclaimer: form.disclaimer,
    preferences_url: form.preferences_url.trim() || null,
  };
}

export function EmailFooterEditor({
  config,
  products,
  forms,
}: {
  config: EmailFooterConfig;
  products: SiteProduct[];
  forms: FormTemplateRecord[];
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => toForm(config));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  const previewHtml = useMemo(() => {
    const footerConfig = toConfig(config.locale, form, products, forms);
    return composeBrandedEmail({
      bodyHtml:
        "<p style='margin:0;color:#1A2E1A'>Примерен текст на имейл. Тук се показва съдържанието на кампанията или автоматизацията.</p>",
      locale: config.locale,
      unsubscribeHref: `/${config.locale}/unsubscribe?token=example`,
      footerConfig,
    });
  }, [config.locale, form, products, forms]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveEmailFooter({ locale: config.locale, ...form });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
    });
  }

  const title = config.locale === "bg" ? "Български имейл" : "English email";

  return (
    <div className="space-y-6">
      <Card title={title} className="space-y-4">
        <p className="text-sm font-semibold text-ink">Горен header</p>
        <p className="text-xs text-ink-soft">
          Зелената лента най-отгоре на всеки имейл. Може да е текст, снимка или и двете
          — и може да се изключи.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.header_enabled}
            onChange={(e) => set("header_enabled", e.target.checked)}
          />
          Показвай header
        </label>

        {form.header_enabled && (
          <div className="space-y-4 rounded-xl border border-ink/10 bg-cream-2/20 p-4">
            <ImageUploadField
              label="Снимка / лого в header"
              hint="Празно = само текст. Малко лого в лентата, или пълна ширина отдолу."
              value={form.header_image_url}
              onChange={(url) => set("header_image_url", url)}
              folder="email"
              previewFit="contain"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.header_image_full_width}
                onChange={(e) => set("header_image_full_width", e.target.checked)}
              />
              Снимката на пълна ширина (като банер)
            </label>
            <Field label="Име (голям текст)">
              <Input
                value={form.header_title}
                onChange={(e) => set("header_title", e.target.value)}
              />
            </Field>
            <Field label="Подзаглавие">
              <Input
                value={form.header_tagline}
                onChange={(e) => set("header_tagline", e.target.value)}
              />
            </Field>
            <Field label="Трети ред (длъжност)">
              <Input
                value={form.header_subtitle}
                onChange={(e) => set("header_subtitle", e.target.value)}
              />
            </Field>
            <Field label="Цвят на лентата">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.header_bg_color}
                  onChange={(e) => set("header_bg_color", e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-ink/15"
                />
                <Input
                  value={form.header_bg_color}
                  onChange={(e) => set("header_bg_color", e.target.value)}
                />
              </div>
            </Field>
          </div>
        )}

        <hr className="border-ink/10" />
        <p className="text-sm font-semibold text-ink">Личен подпис</p>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.signature_enabled}
            onChange={(e) => set("signature_enabled", e.target.checked)}
          />
          Показвай личен подпис (снимка + контакти)
        </label>

        <ImageUploadField
          label="Снимка за подпис"
          hint="Портрет в долната част на имейла — показва се цялата снимка, без изрязване."
          value={form.signature_image_url}
          onChange={(url) => set("signature_image_url", url)}
          folder="email"
          previewFit="contain"
        />

        <Field label="Затварящ ред">
          <Input
            value={form.signature_closing}
            onChange={(e) => set("signature_closing", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Име">
            <Input
              value={form.signature_name}
              onChange={(e) => set("signature_name", e.target.value)}
            />
          </Field>
          <Field label="Имейл (подпис)">
            <Input
              value={form.signature_email}
              onChange={(e) => set("signature_email", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Длъжност / квалификация">
          <Textarea
            rows={2}
            value={form.signature_title}
            onChange={(e) => set("signature_title", e.target.value)}
          />
        </Field>
        <Field label="Телефон (подпис)">
          <Input
            value={form.signature_phone}
            onChange={(e) => set("signature_phone", e.target.value)}
          />
        </Field>

        <SignatureLinksEditor
          locale={config.locale}
          links={form.signature_links}
          products={products}
          forms={forms}
          onChange={(signature_links) => set("signature_links", signature_links)}
        />

        <hr className="border-ink/10" />
        <p className="text-sm font-semibold text-ink">Фирмен footer</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Име на бранда">
            <Input
              value={form.brand_name}
              onChange={(e) => set("brand_name", e.target.value)}
            />
          </Field>
          <Field label="Цвят на бранда">
            <div className="flex gap-2">
              <input
                type="color"
                value={form.brand_color}
                onChange={(e) => set("brand_color", e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-lg border border-ink/15"
              />
              <Input
                value={form.brand_color}
                onChange={(e) => set("brand_color", e.target.value)}
              />
            </div>
          </Field>
        </div>
        <Field label="Уебсайт">
          <Input
            value={form.website_url}
            onChange={(e) => set("website_url", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имейл (footer)">
            <Input
              value={form.footer_email}
              onChange={(e) => set("footer_email", e.target.value)}
            />
          </Field>
          <Field label="Мобилен">
            <Input
              value={form.footer_phone}
              onChange={(e) => set("footer_phone", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Адрес ред 1">
            <Input
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
            />
          </Field>
          <Field label="Адрес ред 2">
            <Input
              value={form.address_line2}
              onChange={(e) => set("address_line2", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook URL">
            <Input
              value={form.facebook_url}
              onChange={(e) => set("facebook_url", e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </Field>
          <Field label="YouTube URL">
            <Input
              value={form.youtube_url}
              onChange={(e) => set("youtube_url", e.target.value)}
              placeholder="https://youtube.com/..."
            />
          </Field>
        </div>
        <Field label="Текст „защо получихте имейла“">
          <Textarea
            rows={3}
            value={form.disclaimer}
            onChange={(e) => set("disclaimer", e.target.value)}
          />
        </Field>
        <Field label="Линк „Настройки“ (по избор)">
          <Input
            value={form.preferences_url}
            onChange={(e) => set("preferences_url", e.target.value)}
            placeholder="https://..."
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.copyright_enabled}
            onChange={(e) => set("copyright_enabled", e.target.checked)}
          />
          Показвай © ред в края
        </label>

        {error && <p className="text-sm text-coral-600">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Запазено" : "Запази"}
        </button>
      </Card>

      <div className="overflow-hidden rounded-xl border border-ink/10 bg-ink/5">
        <p className="border-b border-ink/10 bg-white px-4 py-2 text-xs font-medium text-ink-soft">
          Преглед на footer (header + примерно съдържание)
        </p>
        <iframe
          title="Email footer preview"
          srcDoc={previewHtml}
          className="h-[520px] w-full bg-white"
          sandbox=""
        />
      </div>
    </div>
  );
}
