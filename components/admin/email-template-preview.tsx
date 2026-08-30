"use client";

import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { composeBrandedEmail } from "@/lib/email/layout";
import { expandEmailProductMarkers } from "@/lib/email/products-block";
import { expandEmailGuideMarkers } from "@/lib/email/guides-block";
import { expandEmailFormMarkers } from "@/lib/email/forms-block";
import { normalizeEmailBodyHtml } from "@/lib/email/normalize-body";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import { useStripeCatalog } from "@/components/admin/stripe-locale-picker";
import { cn } from "@/lib/utils";

export function EmailTemplatePreview({
  bodyHtml,
  ctaLabel,
  ctaUrl,
  locale = "bg",
  products = [],
  guides = [],
  forms = [],
  heroImageUrl = "",
  height = 620,
}: {
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  locale?: "bg" | "en";
  products?: SiteProduct[];
  guides?: SiteGuide[];
  forms?: FormTemplateRecord[];
  heroImageUrl?: string;
  /** Preview viewport height in px. */
  height?: number;
}) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const stripeCatalog = useStripeCatalog(bodyHtml.includes("prod_"));

  const srcDoc = useMemo(() => {
    const label = ctaLabel.trim();
    const href = ctaUrl.trim();
    const productsById = new Map(
      products.map((product) => [product.id.toLowerCase(), product]),
    );
    const stripeById = new Map(
      stripeCatalog.items.map((item) => [item.stripeProductId, item]),
    );
    const guidesById = new Map(
      guides.map((guide) => [guide.id.toLowerCase(), guide]),
    );
    const formsById = new Map(forms.map((form) => [form.id.toLowerCase(), form]));
    const previewHref = new Map(
      forms.map((form) => [form.id.toLowerCase(), `/${locale}/forms/${form.slug}`]),
    );
    let expandedBody = normalizeEmailBodyHtml(
      bodyHtml.trim() || "Съдържание на имейла…",
    );
    expandedBody = expandEmailProductMarkers(
      expandedBody,
      productsById,
      locale,
      stripeById,
    );
    expandedBody = expandEmailGuideMarkers(expandedBody, guidesById, locale);
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
      heroImageUrl: heroImageUrl.trim() || null,
    });
  }, [
    bodyHtml,
    ctaLabel,
    ctaUrl,
    locale,
    products,
    guides,
    forms,
    heroImageUrl,
    stripeCatalog.items,
  ]);

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-ink/5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-white px-3 py-2">
        <p className="text-xs font-medium text-ink-soft">
          Преглед — header и footer се добавят автоматично
        </p>
        <div className="inline-flex rounded-lg border border-ink/15 p-0.5">
          <DeviceButton
            active={device === "desktop"}
            onClick={() => setDevice("desktop")}
            label="Компютър"
          >
            <Monitor className="h-3.5 w-3.5" />
          </DeviceButton>
          <DeviceButton
            active={device === "mobile"}
            onClick={() => setDevice("mobile")}
            label="Телефон"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </DeviceButton>
        </div>
      </div>
      <div
        className={cn(
          "overflow-y-auto",
          device === "mobile" && "flex justify-center bg-ink/10 p-3",
        )}
        style={{ height }}
      >
        <iframe
          title="Email preview"
          srcDoc={srcDoc}
          sandbox=""
          className={cn(
            "h-full bg-white",
            device === "mobile"
              ? // max-w, not a fixed width: the admin panel itself can be
                // narrower than a phone, and a fixed frame would get clipped.
                "w-full max-w-[390px] rounded-2xl border border-ink/15 shadow-sm"
              : "w-full",
          )}
        />
      </div>
    </div>
  );
}

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition-colors",
        active ? "bg-forest-600 text-cream" : "text-ink-soft hover:bg-cream",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
