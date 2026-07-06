"use client";

import { useMemo } from "react";
import { composeBrandedEmail } from "@/lib/email/layout";
import { expandEmailProductMarkers } from "@/lib/email/products-block";
import { expandEmailFormMarkers } from "@/lib/email/forms-block";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { SiteProduct } from "@/lib/supabase/types";

export function EmailTemplatePreview({
  bodyHtml,
  ctaLabel,
  ctaUrl,
  locale = "bg",
  products = [],
  forms = [],
}: {
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  locale?: "bg" | "en";
  products?: SiteProduct[];
  forms?: FormTemplateRecord[];
}) {
  const srcDoc = useMemo(() => {
    const label = ctaLabel.trim();
    const href = ctaUrl.trim();
    const productsById = new Map(
      products.map((product) => [product.id.toLowerCase(), product]),
    );
    const formsById = new Map(forms.map((form) => [form.id.toLowerCase(), form]));
    const previewHref = new Map(
      forms.map((form) => [form.id.toLowerCase(), `/${locale}/forms/${form.slug}`]),
    );
    let expandedBody = expandEmailProductMarkers(
      bodyHtml.trim() || "<p style='color:#9B7B6A;margin:0'>Съдържание на имейла…</p>",
      productsById,
      locale,
    );
    expandedBody = expandEmailFormMarkers(
      expandedBody,
      formsById,
      locale,
      previewHref,
    );
    return composeBrandedEmail({
      bodyHtml: expandedBody,
      locale,
      cta: label && href ? { label, href } : null,
      unsubscribeHref: `/${locale}/unsubscribe?token=example`,
    });
  }, [bodyHtml, ctaLabel, ctaUrl, locale, products, forms]);

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-ink/5">
      <p className="border-b border-ink/10 bg-white px-4 py-2 text-xs font-medium text-ink-soft">
        Преглед на имейла (header + footer се добавят автоматично)
      </p>
      <iframe
        title="Email preview"
        srcDoc={srcDoc}
        className="h-[420px] w-full bg-white"
        sandbox=""
      />
    </div>
  );
}
