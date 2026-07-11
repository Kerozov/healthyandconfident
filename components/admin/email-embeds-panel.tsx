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
    <div className="space-y-4 rounded-xl border border-ink/10 bg-cream/30 p-3 sm:p-4">
      <div>
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
