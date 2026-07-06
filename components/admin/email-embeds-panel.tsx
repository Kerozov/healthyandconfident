"use client";

import type { FormTemplateRecord } from "@/lib/forms/types";
import type { SiteProduct } from "@/lib/supabase/types";
import { EmailProductPicker } from "@/components/admin/email-product-picker";
import { EmailFormPicker } from "@/components/admin/email-form-picker";
import { EmailAttachmentPicker } from "@/components/admin/email-attachment-picker";

export function EmailEmbedsPanel({
  locale,
  html,
  onHtmlChange,
  products,
  forms,
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
  attachmentPath: string;
  attachmentFilename: string;
  onAttachmentChange: (path: string, filename: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5 rounded-xl border border-ink/10 bg-cream/30 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Продукти в имейла</p>
        <div className="mt-3">
          <EmailProductPicker
            products={products}
            locale={locale}
            html={html}
            onInsert={onHtmlChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-5">
        <p className="text-sm font-semibold text-ink">Форми в имейла</p>
        <div className="mt-3">
          <EmailFormPicker
            forms={forms}
            locale={locale}
            html={html}
            onInsert={onHtmlChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-5">
        <EmailAttachmentPicker
          path={attachmentPath}
          filename={attachmentFilename}
          onChange={onAttachmentChange}
          label="PDF прикачка"
          hint="По избор — PDF файл, прикачен към всеки изпратен имейл."
        />
      </div>
    </div>
  );
}
