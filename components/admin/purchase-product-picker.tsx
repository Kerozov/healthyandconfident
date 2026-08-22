"use client";

import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function PurchaseProductPicker({
  products,
  guides = [],
  selectedIds,
  onChange,
  disabled,
}: {
  products: SiteProduct[];
  guides?: SiteGuide[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  if (products.length === 0 && guides.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма продукти или ръководства — добави ги в Website.
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

  function Item({
    id,
    title_bg,
    title_en,
    kind,
  }: {
    id: string;
    title_bg: string;
    title_en: string;
    kind: "product" | "guide";
  }) {
    const checked = selectedIds.includes(id);
    return (
      <label
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
          onChange={() => toggle(id)}
        />
        <span>
          <span className="font-medium text-ink">{title_bg}</span>
          {title_en && title_en !== title_bg && (
            <span className="ml-1 text-ink-soft">/ {title_en}</span>
          )}
          {kind === "guide" && (
            <span className="ml-1.5 rounded-full bg-forest-50 px-1.5 py-0.5 text-[10px] font-semibold text-forest-700">
              наръчник
            </span>
          )}
        </span>
      </label>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-soft">
        Задължително избери поне един продукт или наръчник — автоматизацията се пуска само при негова покупка.
      </p>
      <div className="flex flex-col gap-2">
        {products.map((product) => (
          <Item
            key={product.id}
            id={product.id}
            title_bg={product.title_bg}
            title_en={product.title_en}
            kind="product"
          />
        ))}
        {guides.map((guide) => (
          <Item
            key={guide.id}
            id={guide.id}
            title_bg={guide.title_bg}
            title_en={guide.title_en}
            kind="guide"
          />
        ))}
      </div>
    </div>
  );
}
