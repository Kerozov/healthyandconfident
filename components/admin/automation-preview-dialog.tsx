"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { Automation, SiteGuide, SiteProduct } from "@/lib/supabase/types";
import { EmailTemplatePreview } from "@/components/admin/email-template-preview";
import { cn } from "@/lib/utils";

type PreviewableAutomation = Pick<
  Automation,
  | "name"
  | "subject_bg"
  | "subject_en"
  | "html_bg"
  | "html_en"
  | "cta_label_bg"
  | "cta_label_en"
  | "cta_url_bg"
  | "cta_url_en"
  | "hero_image_url_bg"
  | "hero_image_url_en"
>;

/** Read-only look at a step's email — straight from the list, without opening the editor. */
export function AutomationPreviewDialog({
  automation: a,
  products,
  guides,
  forms,
  onClose,
}: {
  automation: PreviewableAutomation;
  products: SiteProduct[];
  guides: SiteGuide[];
  forms: FormTemplateRecord[];
  onClose: () => void;
}) {
  const hasBg = Boolean(a.html_bg?.trim());
  const hasEn = Boolean(a.html_en?.trim());
  const [locale, setLocale] = useState<"bg" | "en">(hasBg || !hasEn ? "bg" : "en");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bg = locale === "bg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-preview-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3">
          <div className="min-w-0">
            <h2 id="automation-preview-title" className="font-semibold text-ink">
              Преглед на имейла
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">„{a.name}“</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="inline-flex rounded-lg border border-ink/15 p-0.5">
              {(["bg", "en"] as const).map((l) => {
                const has = l === "bg" ? hasBg : hasEn;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLocale(l)}
                    aria-pressed={locale === l}
                    title={has ? undefined : "Няма съдържание на този език"}
                    className={cn(
                      "inline-flex h-7 items-center rounded-md px-2.5 text-[11px] font-semibold uppercase transition-colors",
                      locale === l ? "bg-forest-600 text-cream" : "text-ink-soft hover:bg-cream",
                      !has && locale !== l && "opacity-50",
                    )}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Затвори"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <EmailTemplatePreview
            subject={(bg ? a.subject_bg : a.subject_en) || a.name}
            bodyHtml={(bg ? a.html_bg : a.html_en) ?? ""}
            ctaLabel={(bg ? a.cta_label_bg : a.cta_label_en) ?? ""}
            ctaUrl={(bg ? a.cta_url_bg : a.cta_url_en) ?? ""}
            locale={locale}
            products={products}
            guides={guides}
            forms={forms}
            heroImageUrl={(bg ? a.hero_image_url_bg : a.hero_image_url_en) ?? ""}
            height="fill"
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
