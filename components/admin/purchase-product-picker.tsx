"use client";

import type { SiteProduct } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function PurchaseProductPicker({
  products,
  selectedIds,
  onChange,
  disabled,
}: {
  products: SiteProduct[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма продукти в магазина — добави ги в Website → Продукти.
      </p>
    );
  }

  function toggle(id: string) {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-soft">
        Задължително избери поне един продукт — автоматизацията се пуска само при негова покупка.
      </p>
      <div className="flex flex-col gap-2">
        {products.map((product) => {
          const checked = selectedIds.includes(product.id);
          return (
            <label
              key={product.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                checked
                  ? "border-forest-500/40 bg-forest-500/10 text-forest-800"
                  : "border-ink/15 bg-white text-ink-soft hover:border-ink/25",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(product.id)}
              />
              <span>
                <span className="font-medium text-ink">{product.title_bg}</span>
                {product.title_en && product.title_en !== product.title_bg && (
                  <span className="ml-1 text-ink-soft">/ {product.title_en}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
