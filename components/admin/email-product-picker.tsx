"use client";

import { Plus } from "lucide-react";
import type { SiteProduct } from "@/lib/supabase/types";
import {
  extractProductIdsFromHtml,
  productEmailMarker,
} from "@/lib/email/products-block";
import { cn } from "@/lib/utils";

export function EmailProductPicker({
  products,
  locale,
  html,
  onInsert,
  disabled,
}: {
  products: SiteProduct[];
  locale: "bg" | "en";
  html: string;
  onInsert: (nextHtml: string) => void;
  disabled?: boolean;
}) {
  const attached = new Set(extractProductIdsFromHtml(html));
  const sorted = [...products].sort((a, b) => a.sort_order - b.sort_order || a.title_bg.localeCompare(b.title_bg, "bg"));

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма продукти — създай ги в Admin → Website → Продукти.
      </p>
    );
  }

  function addProduct(productId: string) {
    onInsert(`${html}${productEmailMarker(productId)}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        Вмъкват се като карточка с актуални данни при изпращане.
      </p>
      <div className="grid gap-2">
        {sorted.map((product) => {
          const title = locale === "en" ? product.title_en : product.title_bg;
          const price =
            locale === "en" ? product.price_label_en : product.price_label_bg;
          const isAttached = attached.has(product.id.toLowerCase());
          const canAdd = Boolean(product.stripe_url?.trim());

          return (
            <div
              key={product.id}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border p-2.5 sm:gap-3 sm:p-3",
                isAttached
                  ? "border-forest-500/30 bg-forest-500/5"
                  : "border-ink/10 bg-white",
                !product.enabled && "opacity-60",
              )}
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-green-100 sm:h-14 sm:w-14">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-green-700">
                    HC
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{title}</p>
                {price && (
                  <p className="text-xs font-medium text-green-700">{price}</p>
                )}
                {isAttached && (
                  <p className="text-[11px] text-forest-700">Вече в имейла</p>
                )}
              </div>
              <button
                type="button"
                disabled={disabled || !canAdd}
                onClick={() => addProduct(product.id)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1 sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold"
                title={canAdd ? "Добави в имейла" : "Липсва Stripe линк"}
                aria-label="Добави"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Добави</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
