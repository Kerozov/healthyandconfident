"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Loader2, Pencil, RefreshCw } from "lucide-react";
import type { StripeCatalogItem } from "@/lib/admin/stripe-product-types";
import {
  fetchStripeCatalog,
  importStripeProduct,
} from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";

export function StripeCatalogPanel({
  onEditProduct,
  onImported,
}: {
  onEditProduct: (siteProductId: string) => void;
  onImported: (productId: string) => void;
}) {
  const [items, setItems] = useState<StripeCatalogItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);

  function loadCatalog() {
    setLoadError(null);
    startTransition(async () => {
      const res = await fetchStripeCatalog();
      if (!res.ok) {
        setLoadError(res.message ?? "Неуспешно зареждане от Stripe");
        return;
      }
      setItems(res.items ?? []);
      setLoaded(true);
    });
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlinked = items.filter((i) => !i.linkedProductId);
  const linked = items.filter((i) => i.linkedProductId);

  function handleImport(stripeProductId: string) {
    setImportingId(stripeProductId);
    startTransition(async () => {
      const res = await importStripeProduct(stripeProductId);
      setImportingId(null);
      if (!res.ok) {
        setLoadError(res.message ?? "Импортът неуспешен");
        return;
      }
      if (res.id) {
        onImported(res.id);
      }
      loadCatalog();
    });
  }

  return (
    <section className="mb-8 rounded-2xl border border-ink/10 bg-cream-2/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Продукти в Stripe</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Всички платени продукти от Stripe акаунта. Добави липсващите в сайта,
            после ги редактирай и включи в магазина.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCatalog}
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-4 text-xs font-semibold hover:bg-white disabled:opacity-60"
        >
          {pending && !importingId ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Обнови от Stripe
        </button>
      </div>

      {loadError && <p className="mt-3 text-sm text-coral-600">{loadError}</p>}

      {!loaded && pending && (
        <p className="mt-4 text-sm text-ink-soft">Зареждане от Stripe…</p>
      )}

      {loaded && unlinked.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral-700">
            Не са в сайта ({unlinked.length})
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                  <th className="py-2 pr-3">Продукт</th>
                  <th className="py-2 pr-3">Цена</th>
                  <th className="py-2 pr-3">Статус</th>
                  <th className="py-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {unlinked.map((item) => (
                  <tr key={item.stripeProductId} className="border-b border-ink/5">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="font-mono text-[10px] text-ink-soft">
                        {item.stripeProductId}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3">{item.priceLabel || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          item.active
                            ? "bg-forest-600/10 text-forest-700"
                            : "bg-ink/10 text-ink-soft",
                        )}
                      >
                        {item.active ? "Активен" : "Архивиран"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleImport(item.stripeProductId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-700 disabled:opacity-60"
                      >
                        {importingId === item.stripeProductId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Добави в сайта
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loaded && linked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
            Вече в сайта ({linked.length})
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                  <th className="py-2 pr-3">Stripe продукт</th>
                  <th className="py-2 pr-3">В сайта</th>
                  <th className="py-2">Действие</th>
                </tr>
              </thead>
              <tbody>
                {linked.map((item) => (
                  <tr key={item.stripeProductId} className="border-b border-ink/5">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-ink-soft">{item.priceLabel}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {item.linkedProductTitle}
                    </td>
                    <td className="py-2.5">
                      {item.linkedProductId && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(item.linkedProductId!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Редактирай
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loaded && items.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft">Няма продукти в Stripe акаунта.</p>
      )}
    </section>
  );
}
