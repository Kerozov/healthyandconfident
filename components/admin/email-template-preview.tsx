"use client";

import { useMemo } from "react";
import { composeBrandedEmail } from "@/lib/email/layout";
import { expandEmailProductMarkers } from "@/lib/email/products-block";
import type { SiteProduct } from "@/lib/supabase/types";

export function EmailTemplatePreview({
  bodyHtml,
  ctaLabel,
  ctaUrl,
  locale = "bg",
  products = [],
}: {
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  locale?: "bg" | "en";
  products?: SiteProduct[];
}) {
  const srcDoc = useMemo(() => {
    const label = ctaLabel.trim();
    const href = ctaUrl.trim();
    const productsById = new Map(
      products.map((product) => [product.id.toLowerCase(), product]),
    );
    const expandedBody = expandEmailProductMarkers(
      bodyHtml.trim() || "<p style='color:#9B7B6A;margin:0'>Съдържание на имейла…</p>",
      productsById,
      locale,
    );
    return composeBrandedEmail({
      bodyHtml: expandedBody,
      locale,
      cta: label && href ? { label, href } : null,
      unsubscribeHref: `/${locale}/unsubscribe?token=example`,
    });
  }, [bodyHtml, ctaLabel, ctaUrl, locale, products]);

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
