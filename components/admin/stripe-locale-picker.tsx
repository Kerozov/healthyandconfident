"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type {
  StripeCatalogItem,
  StripePaymentLinkItem,
} from "@/lib/admin/stripe-product-types";
import { fetchStripeCatalog } from "@/app/(admin)/admin/actions";
import { Field, Input, Select } from "@/components/admin/fields";
import { formatStripeIdInput, isValidStripeIdInput } from "@/lib/stripe/parse-stripe-id";

export type StripeLocaleValue = {
  stripe_id: string;
  stripe_url: string;
  price_label?: string;
};

let cachedCatalog: {
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
} | null = null;

function loadCatalogOnce(): Promise<{
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
}> {
  if (cachedCatalog) return Promise.resolve(cachedCatalog);
  return fetchStripeCatalog().then((res) => {
    if (!res.ok) {
      throw new Error(res.message ?? "Неуспешно зареждане от Stripe");
    }
    cachedCatalog = {
      items: res.items ?? [],
      paymentLinks: res.paymentLinks ?? [],
    };
    return cachedCatalog;
  });
}

export function invalidateStripeCatalogCache() {
  cachedCatalog = null;
}

export function useStripeCatalog(enabled = true): {
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
  pending: boolean;
  error: string | null;
} {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StripeCatalogItem[]>(
    cachedCatalog?.items ?? [],
  );
  const [paymentLinks, setPaymentLinks] = useState<StripePaymentLinkItem[]>(
    cachedCatalog?.paymentLinks ?? [],
  );

  useEffect(() => {
    if (!enabled) return;
    if (cachedCatalog) {
      setItems(cachedCatalog.items);
      setPaymentLinks(cachedCatalog.paymentLinks);
      setError(null);
      return;
    }
    startTransition(async () => {
      try {
        const catalog = await loadCatalogOnce();
        setItems(catalog.items);
        setPaymentLinks(catalog.paymentLinks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Stripe catalog failed");
      }
    });
  }, [enabled]);

  return { items, paymentLinks, pending, error };
}

export function StripeLocalePicker({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: StripeLocaleValue;
  onChange: (next: StripeLocaleValue) => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StripeCatalogItem[]>(cachedCatalog?.items ?? []);
  const [paymentLinks, setPaymentLinks] = useState<StripePaymentLinkItem[]>(
    cachedCatalog?.paymentLinks ?? [],
  );

  useEffect(() => {
    if (cachedCatalog) {
      setItems(cachedCatalog.items);
      setPaymentLinks(cachedCatalog.paymentLinks);
      return;
    }
    startTransition(async () => {
      try {
        const catalog = await loadCatalogOnce();
        setItems(catalog.items);
        setPaymentLinks(catalog.paymentLinks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Stripe catalog failed");
      }
    });
  }, []);

  const selectedProductId = useMemo(() => {
    const id = value.stripe_id.trim();
    if (id.startsWith("prod_")) return id;
    if (id.startsWith("price_")) {
      return items.find((item) => item.stripePriceId === id)?.stripeProductId ?? "";
    }
    return "";
  }, [value.stripe_id, items]);

  const selectedLinkUrl = useMemo(() => {
    const url = value.stripe_url.trim();
    return paymentLinks.some((link) => link.url === url) ? url : "";
  }, [value.stripe_url, paymentLinks]);

  const activeItems = items.filter((item) => item.active);
  const archivedSelected =
    selectedProductId && !activeItems.some((item) => item.stripeProductId === selectedProductId)
      ? items.find((item) => item.stripeProductId === selectedProductId)
      : null;

  function pickProduct(stripeProductId: string) {
    if (!stripeProductId) {
      onChange({ ...value, stripe_id: "" });
      return;
    }
    const item = items.find((row) => row.stripeProductId === stripeProductId);
    if (!item) {
      onChange({ ...value, stripe_id: stripeProductId });
      return;
    }
    const stripeId = formatStripeIdInput({
      stripe_product_id: item.stripeProductId,
      stripe_price_id: item.stripePriceId,
    });
    onChange({
      stripe_id: stripeId,
      stripe_url: value.stripe_url,
      price_label: value.price_label?.trim() ? value.price_label : item.priceLabel,
    });
  }

  function pickPaymentLink(url: string) {
    if (!url) {
      onChange({ ...value, stripe_url: "" });
      return;
    }
    const link = paymentLinks.find((row) => row.url === url);
    if (!link) {
      onChange({ ...value, stripe_url: url });
      return;
    }
    onChange({
      stripe_id: formatStripeIdInput({
        stripe_product_id: link.stripeProductId,
        stripe_price_id: link.stripePriceId,
      }),
      stripe_url: link.url,
      price_label: value.price_label?.trim() ? value.price_label : link.priceLabel,
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-ink/10 bg-white/70 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{hint}</p>}
      </div>

      <Field label="Продукт от Stripe">
        <Select
          value={selectedProductId}
          disabled={disabled || pending}
          onChange={(e) => pickProduct(e.target.value)}
        >
          <option value="">— избери продукт —</option>
          {archivedSelected && (
            <option value={archivedSelected.stripeProductId}>
              {archivedSelected.name} (архивиран)
            </option>
          )}
          {activeItems.map((item) => (
            <option key={item.stripeProductId} value={item.stripeProductId}>
              {item.name}
              {item.priceLabel ? ` · ${item.priceLabel}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      {paymentLinks.length > 0 && (
        <Field label="Payment Link от Stripe">
          <Select
            value={selectedLinkUrl}
            disabled={disabled || pending}
            onChange={(e) => pickPaymentLink(e.target.value)}
          >
            <option value="">— избери линк —</option>
            {paymentLinks.map((link) => (
              <option key={link.id} value={link.url}>
                {link.name}
                {link.priceLabel ? ` · ${link.priceLabel}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field
        label="Payment Link (URL)"
        hint="buy.stripe.com — ползва се само ако няма избрана Stripe цена."
      >
        <Input
          value={value.stripe_url}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, stripe_url: e.target.value })}
          placeholder="https://buy.stripe.com/..."
        />
      </Field>

      <Field
        label="Price / Product ID (по избор)"
        hint="Ако избереш продукт горе, това се попълва автоматично."
      >
        <Input
          value={value.stripe_id}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, stripe_id: e.target.value })}
          placeholder="price_… или prod_…"
        />
      </Field>

      {pending && items.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Зареждане от Stripe…
        </p>
      )}
      {error && <p className="text-xs text-coral-600">{error}</p>}
      {value.stripe_id.trim() && !isValidStripeIdInput(value.stripe_id) && (
        <p className="text-xs text-coral-600">
          Stripe ID трябва да започва с price_ или prod_.
        </p>
      )}
    </div>
  );
}

/** Compact dropdowns that fill a single URL (email buttons, campaign CTA, signature). */
export function StripeHrefPicker({
  href,
  onHrefChange,
  disabled,
}: {
  href: string;
  onHrefChange: (href: string) => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StripeCatalogItem[]>(cachedCatalog?.items ?? []);
  const [paymentLinks, setPaymentLinks] = useState<StripePaymentLinkItem[]>(
    cachedCatalog?.paymentLinks ?? [],
  );

  useEffect(() => {
    if (cachedCatalog) {
      setItems(cachedCatalog.items);
      setPaymentLinks(cachedCatalog.paymentLinks);
      return;
    }
    startTransition(async () => {
      try {
        const catalog = await loadCatalogOnce();
        setItems(catalog.items);
        setPaymentLinks(catalog.paymentLinks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Stripe catalog failed");
      }
    });
  }, []);

  const selectedLinkUrl = useMemo(() => {
    const url = href.trim();
    return paymentLinks.some((link) => link.url === url) ? url : "";
  }, [href, paymentLinks]);

  const selectedProductId = useMemo(() => {
    const link = paymentLinks.find((row) => row.url === href.trim());
    return link?.stripeProductId ?? "";
  }, [href, paymentLinks]);

  const activeItems = items.filter((item) => item.active);

  function pickPaymentLink(url: string) {
    setError(null);
    onHrefChange(url);
  }

  function pickProduct(stripeProductId: string) {
    setError(null);
    if (!stripeProductId) {
      onHrefChange("");
      return;
    }
    const link = paymentLinks.find((row) => row.stripeProductId === stripeProductId);
    if (link) {
      onHrefChange(link.url);
      return;
    }
    setError(
      "Този Stripe продукт няма Payment Link. Избери линк от менюто долу или създай линк в Stripe.",
    );
  }

  return (
    <div className="space-y-2">
      <Field label="Продукт от Stripe">
        <Select
          value={selectedProductId}
          disabled={disabled || pending}
          onChange={(e) => pickProduct(e.target.value)}
        >
          <option value="">— избери продукт —</option>
          {activeItems.map((item) => (
            <option key={item.stripeProductId} value={item.stripeProductId}>
              {item.name}
              {item.priceLabel ? ` · ${item.priceLabel}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      {paymentLinks.length > 0 && (
        <Field label="Payment Link от Stripe">
          <Select
            value={selectedLinkUrl}
            disabled={disabled || pending}
            onChange={(e) => pickPaymentLink(e.target.value)}
          >
            <option value="">— избери линк —</option>
            {paymentLinks.map((link) => (
              <option key={link.id} value={link.url}>
                {link.name}
                {link.priceLabel ? ` · ${link.priceLabel}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {pending && items.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Зареждане от Stripe…
        </p>
      )}
      {error && <p className="text-xs text-coral-600">{error}</p>}
    </div>
  );
}
