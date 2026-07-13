"use client";

import { useState, useTransition } from "react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { SiteProduct } from "@/lib/supabase/types";
import { EmailProductPicker } from "@/components/admin/email-product-picker";
import { EmailFormPicker } from "@/components/admin/email-form-picker";
import { EmailAttachmentPicker } from "@/components/admin/email-attachment-picker";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { inlineEmailImageHtml } from "@/lib/email/hero-image";

export function EmailEmbedsPanel({
  locale,
  html,
  onHtmlChange,
  products,
  forms,
  heroImageUrl,
  onHeroImageChange,
  attachmentPath,
  attachmentFilename,
  onAttachmentChange,
  disabled,
}: {
  locale: "bg" | "en";
  html: string;
  onHtmlChange: (html: string) => void;
  products: SiteProduct[];
  forms: FormTemplateRecord[];
  heroImageUrl: string;
  onHeroImageChange: (url: string) => void;
  attachmentPath: string;
  attachmentFilename: string;
  onAttachmentChange: (path: string, filename: string) => void;
  disabled?: boolean;
}) {
  const [, startTransition] = useTransition();
  const [inlineNote, setInlineNote] = useState<string | null>(null);

  function insertInlineImage(url: string) {
    if (!url.trim()) return;
    onHtmlChange(`${html.trim()}\n${inlineEmailImageHtml(url)}`);
    setInlineNote("Снимката е добавена в текста.");
    startTransition(() => {
      setTimeout(() => setInlineNote(null), 2500);
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-ink/10 bg-cream/30 p-3 sm:p-4">
      <ImageUploadField
        label="Банер в началото на имейла"
        hint="Голяма снимка най-отгоре — както в маркетинговите имейли. По избор."
        value={heroImageUrl}
        onChange={onHeroImageChange}
        folder="email"
        previewFit="contain"
        className={disabled ? "pointer-events-none opacity-60" : undefined}
      />

      <div className="border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold text-ink">Продукти</p>
        <div className="mt-2">
          <EmailProductPicker
            products={products}
            locale={locale}
            html={html}
            onInsert={onHtmlChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold text-ink">Форми</p>
        <div className="mt-2">
          <EmailFormPicker
            forms={forms}
            locale={locale}
            html={html}
            onInsert={onHtmlChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-4">
        <ImageUploadField
          label="Снимка в текста"
          hint="Качи и вмъкни снимка в съдържанието (не само банер отгоре)."
          value=""
          onChange={(url) => insertInlineImage(url)}
          folder="email"
          previewFit="contain"
          className={disabled ? "pointer-events-none opacity-60" : undefined}
        />
        {inlineNote && <p className="text-xs text-forest-700">{inlineNote}</p>}
      </div>

      <div className="border-t border-ink/10 pt-4">
        <EmailAttachmentPicker
          path={attachmentPath}
          filename={attachmentFilename}
          onChange={onAttachmentChange}
          label="PDF прикачка"
          hint="По избор — PDF към имейла."
        />
      </div>
    </div>
  );
}
