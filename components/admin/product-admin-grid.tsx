"use client";

import { useState, useTransition } from "react";
import { GripVertical, Pencil, Trash2, ShoppingBag } from "lucide-react";
import type { SiteProduct } from "@/lib/supabase/types";
import { reorderSiteProducts } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";

export function ProductAdminGrid({
  products,
  onEdit,
  onDelete,
  onReordered,
  disabled,
}: {
  products: SiteProduct[];
  onEdit: (product: SiteProduct) => void;
  onDelete: (id: string, title: string) => void;
  onReordered: () => void;
  disabled?: boolean;
}) {
  const [items, setItems] = useState(products);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (products !== items && !pending && !dragId) {
    setItems(products);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((p) => p.id === dragId);
    const to = items.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);

    startTransition(async () => {
      await reorderSiteProducts(next.map((p) => p.id));
      onReordered();
    });
  }

  if (items.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-soft">
        Няма продукти. Натисни <strong>Нов продукт</strong>.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((product) => (
        <div
          key={product.id}
          draggable={!disabled && !pending}
          onDragStart={() => setDragId(product.id)}
          onDragEnd={() => setDragId(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(product.id)}
          className={cn(
            "group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
            dragId === product.id
              ? "border-coral-400 opacity-60"
              : "border-ink/10 hover:border-forest-500/30 hover:shadow-md",
            !product.enabled && "opacity-70",
          )}
        >
          <div className="absolute left-2 top-2 z-10 rounded-lg bg-white/90 p-1 opacity-0 shadow-sm transition group-hover:opacity-100">
            <GripVertical className="h-4 w-4 cursor-grab text-ink-soft active:cursor-grabbing" />
          </div>
          <div className="relative aspect-[16/10] bg-green-100">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-green-600/40" />
              </div>
            )}
            <span
              className={cn(
                "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                product.enabled
                  ? "bg-forest-600 text-white"
                  : "bg-ink/60 text-white",
              )}
            >
              {product.enabled ? "Активен" : "Скрит"}
            </span>
            {!product.stripe_url?.trim() && product.stripe_price_id?.trim() && (
              <span className="absolute left-2 top-2 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                Checkout през сайта
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            {product.price_label_bg && (
              <p className="font-display text-lg font-semibold text-green-700">
                {product.price_label_bg}
              </p>
            )}
            <h3 className="mt-1 font-semibold text-ink">{product.title_bg}</h3>
            {product.description_bg && (
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-soft">
                {product.description_bg}
              </p>
            )}
            <div className="mt-4 flex gap-1">
              <button
                type="button"
                onClick={() => onEdit(product)}
                disabled={disabled || pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(product.id, product.title_bg)}
                disabled={disabled || pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
