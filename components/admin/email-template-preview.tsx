"use client";

import { useMemo } from "react";
import { composeBrandedEmail } from "@/lib/email/layout";

export function EmailTemplatePreview({
  bodyHtml,
  ctaLabel,
  ctaUrl,
  locale = "bg",
}: {
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  locale?: "bg" | "en";
}) {
  const srcDoc = useMemo(() => {
    const label = ctaLabel.trim();
    const href = ctaUrl.trim();
    return composeBrandedEmail({
      bodyHtml: bodyHtml.trim() || "<p style='color:#9B7B6A;margin:0'>Съдържание на имейла…</p>",
      locale,
      cta: label && href ? { label, href } : null,
    });
  }, [bodyHtml, ctaLabel, ctaUrl, locale]);

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
