"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, GripVertical, Pencil, Trash2, ShoppingBag } from "lucide-react";
import type { SiteProduct } from "@/lib/supabase/types";
import { reorderSiteProducts } from "@/app/(admin)/admin/actions";
import {
  productStripeBg,
  productStripeEnOnly,
} from "@/lib/site/product-locale";
import { productCheckoutPath } from "@/lib/site/product-placement";
import { PublicPathLinks } from "@/components/admin/public-path-links";
import { cn } from "@/lib/utils";

function stripeSetupProblem(product: SiteProduct): string | null {
  const bg = productStripeBg(product);
  if (!bg.stripe_price_id && !bg.stripe_url) {
    return "Няма Stripe цена или Payment Link за български — не може да се купи";
  }
  if (product.enabled_en !== false) {
    const en = productStripeEnOnly(product);
    const enHasAnyField = Boolean(
      en.stripe_url || en.stripe_product_id || en.stripe_price_id,
    );
    if (enHasAnyField && !en.stripe_price_id && !en.stripe_url) {
      return "Английската версия има Stripe продукт, но няма цена или Payment Link";
    }
  }
  return null;
}

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
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (products !== items && !pending && !dragId) {
    setItems(products);
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = items.findIndex((p) => p.id === dragId);
    const to = items.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);
    setOverId(null);

    startTransition(async () => {
      await reorderSiteProducts(next.map((p) => p.id));
      onReordered();
    });
  }

  if (items.length === 0) {
    return (
      <p className="p-4 text-sm text-ink-soft">
        Няма продукти. Натисни <strong>Нов продукт</strong> или добави от Stripe горе.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((product) => (
        <div
          key={product.id}
          draggable={!disabled && !pending}
          onDragStart={() => setDragId(product.id)}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setOverId(product.id);
          }}
          onDrop={() => handleDrop(product.id)}
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-all",
            dragId === product.id && "border-coral-400 opacity-50",
            overId === product.id && dragId && dragId !== product.id && "border-forest-500",
            dragId !== product.id &&
              overId !== product.id &&
              "border-ink/10 hover:border-forest-500/30",
            !product.enabled && "opacity-70",
          )}
        >
          <div
            className="inline-flex h-10 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 active:cursor-grabbing"
            aria-label="Влачи за подредба"
          >
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-green-100">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-green-600/40" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-ink">{product.title_bg}</h3>
              {product.price_label_bg && (
                <span className="text-sm font-medium text-green-700">
                  {product.price_label_bg}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  product.enabled
                    ? "bg-forest-600/10 text-forest-700"
                    : "bg-ink/10 text-ink-soft",
                )}
              >
                {product.enabled ? "BG активен" : "BG скрит"}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  product.enabled_en !== false
                    ? "bg-sky-600/10 text-sky-800"
                    : "bg-ink/10 text-ink-soft",
                )}
              >
                {product.enabled_en !== false ? "EN активен" : "EN изключен"}
              </span>
            </div>
            <div className="mt-1.5">
              <PublicPathLinks
                paths={[
                  {
                    label: productCheckoutPath(product.id, "bg"),
                    href: productCheckoutPath(product.id, "bg"),
                  },
                  ...(product.enabled_en !== false
                    ? [
                        {
                          label: productCheckoutPath(product.id, "en"),
                          href: productCheckoutPath(product.id, "en"),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            {stripeSetupProblem(product) && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium leading-snug text-amber-900">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                {stripeSetupProblem(product)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
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
      ))}
    </div>
  );
}
