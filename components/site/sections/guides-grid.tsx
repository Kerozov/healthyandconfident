"use client";

import { ArrowUpRight } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { SiteGuide } from "@/lib/supabase/types";

function GuideCardImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex min-h-[168px] items-center justify-center overflow-hidden bg-cream-2 sm:min-h-[200px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-auto max-h-[240px] w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </div>
  );
}

export function GuidesGrid({
  guides,
  locale,
  cta,
}: {
  guides: SiteGuide[];
  locale: Locale;
  cta: string;
}) {
  if (guides.length === 0) return null;

  return (
    <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {guides.map((guide) => {
        const title = locale === "bg" ? guide.title_bg : guide.title_en;
        const description =
          locale === "bg" ? guide.description_bg : guide.description_en;
        const price =
          locale === "bg" ? guide.price_label_bg : guide.price_label_en;
        const checkoutUrl = guide.stripe_url?.trim() ?? "";

        return (
          <button
            key={guide.id}
            type="button"
            onClick={() => {
              if (!checkoutUrl) return;
              window.open(checkoutUrl, "_blank", "noopener,noreferrer");
            }}
            disabled={!checkoutUrl}
            className="group flex flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guide.image_url ? (
              <GuideCardImage src={guide.image_url} alt={title} />
            ) : (
              <div className="flex min-h-[168px] items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-xl text-white/90 sm:min-h-[200px]">
                PDF
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700">
                  {locale === "bg" ? "наръчник" : "guide"}
                </span>
                {price && (
                  <span className="rounded-full bg-cream-2 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    {price}
                  </span>
                )}
              </div>
              <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-500">
                {title}
              </h3>
              {description && (
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">{description}</p>
              )}
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-500">
                {cta} <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
