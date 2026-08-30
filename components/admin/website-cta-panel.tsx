"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { saveCtaPlacement } from "@/app/(admin)/admin/actions";
import { Field, Input, Select } from "@/components/admin/fields";
import { useStripeCatalog } from "@/components/admin/stripe-locale-picker";
import type {
  StripeCatalogItem,
  StripePaymentLinkItem,
} from "@/lib/admin/stripe-product-types";
import { formatStripeIdInput, isValidStripeIdInput } from "@/lib/stripe/parse-stripe-id";
import { DEFAULT_OFFER_HEADLINE } from "@/lib/site/cta-placements";
import { SITE_BUTTON_GROUPS, type SiteButtonSpec } from "@/lib/site/button-catalog";
import { cn } from "@/lib/utils";

/** Where a button sends the visitor. One choice instead of four competing fields. */
type LinkMode = "default" | "stripe" | "link";

type StripeValue = { stripe_id: string; stripe_url: string };

const EMPTY_STRIPE: StripeValue = { stripe_id: "", stripe_url: "" };

function stripeBg(p: SiteCtaPlacement): StripeValue {
  return {
    stripe_id: formatStripeIdInput(p),
    stripe_url: (p.stripe_url ?? "").trim(),
  };
}

function stripeEn(p: SiteCtaPlacement): StripeValue {
  return {
    stripe_id: formatStripeIdInput({
      stripe_product_id: p.stripe_product_id_en,
      stripe_price_id: p.stripe_price_id_en,
    }),
    stripe_url: (p.stripe_url_en ?? "").trim(),
  };
}

function hasStripe(value: StripeValue): boolean {
  return Boolean(value.stripe_id.trim() || value.stripe_url.trim());
}

/**
 * Stripe wins over a plain link at runtime, so the mode is read back in the
 * same order the site resolves it — opening and saving a button cannot change
 * where it points.
 */
function modeOf(stripe: StripeValue, url: string): LinkMode {
  if (hasStripe(stripe)) return "stripe";
  if (url.trim()) return "link";
  return "default";
}

function stripeName(
  value: StripeValue,
  items: StripeCatalogItem[],
  links: StripePaymentLinkItem[],
): string {
  const url = value.stripe_url.trim();
  const link = links.find((l) => l.url === url);
  if (link) return link.name;
  const id = value.stripe_id.trim();
  const item = items.find(
    (i) => i.stripeProductId === id || i.stripePriceId === id,
  );
  if (item) return item.name;
  return id || url || "Stripe";
}

/** One dropdown for the whole Stripe catalogue; raw ids stay behind „Ръчно“. */
function StripeTargetPicker({
  value,
  onChange,
  items,
  paymentLinks,
  pending,
  error,
  disabled,
}: {
  value: StripeValue;
  onChange: (next: StripeValue) => void;
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
  pending: boolean;
  error: string | null;
  disabled?: boolean;
}) {
  const activeItems = items.filter((i) => i.active);
  const selected = useMemo(() => {
    const url = value.stripe_url.trim();
    if (url && paymentLinks.some((l) => l.url === url)) return `link:${url}`;
    const id = value.stripe_id.trim();
    const item = items.find(
      (i) => i.stripeProductId === id || i.stripePriceId === id,
    );
    if (item) return `prod:${item.stripeProductId}`;
    return "";
  }, [value, items, paymentLinks]);

  const manual = Boolean(
    (value.stripe_id.trim() || value.stripe_url.trim()) && !selected,
  );

  function pick(next: string) {
    if (!next) {
      onChange(EMPTY_STRIPE);
      return;
    }
    if (next.startsWith("link:")) {
      const url = next.slice(5);
      const link = paymentLinks.find((l) => l.url === url);
      onChange({
        stripe_id: link
          ? formatStripeIdInput({
              stripe_product_id: link.stripeProductId,
              stripe_price_id: link.stripePriceId,
            })
          : "",
        stripe_url: url,
      });
      return;
    }
    const item = items.find((i) => i.stripeProductId === next.slice(5));
    onChange({
      // A Payment Link would override the price, so picking a product clears it.
      stripe_url: "",
      stripe_id: item
        ? formatStripeIdInput({
            stripe_product_id: item.stripeProductId,
            stripe_price_id: item.stripePriceId,
          })
        : next.slice(5),
    });
  }

  return (
    <div className="space-y-2">
      <Field
        label="Продукт от Stripe"
        hint="Продукт = плащането се отваря в сайта. Payment Link = отива в страницата на Stripe."
      >
        <Select
          value={selected}
          disabled={disabled || (pending && items.length === 0)}
          onChange={(e) => pick(e.target.value)}
        >
          <option value="">— избери —</option>
          {activeItems.length > 0 && (
            <optgroup label="Продукти">
              {activeItems.map((item) => (
                <option key={item.stripeProductId} value={`prod:${item.stripeProductId}`}>
                  {item.name}
                  {item.priceLabel ? ` · ${item.priceLabel}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {paymentLinks.length > 0 && (
            <optgroup label="Payment Links">
              {paymentLinks.map((link) => (
                <option key={link.id} value={`link:${link.url}`}>
                  {link.name}
                  {link.priceLabel ? ` · ${link.priceLabel}` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>

      {pending && items.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Зареждане от Stripe…
        </p>
      )}
      {error && <p className="text-xs text-coral-600">{error}</p>}

      <details open={manual} className="rounded-lg border border-ink/10 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          Ръчно въвеждане (price_… или линк)
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Stripe ID">
            <Input
              value={value.stripe_id}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, stripe_id: e.target.value })}
              placeholder="price_… или prod_…"
            />
          </Field>
          <Field label="Payment Link (URL)">
            <Input
              value={value.stripe_url}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, stripe_url: e.target.value })}
              placeholder="https://buy.stripe.com/…"
            />
          </Field>
        </div>
        {value.stripe_id.trim() && !isValidStripeIdInput(value.stripe_id) && (
          <p className="mt-2 text-xs text-coral-600">
            Stripe ID трябва да започва с price_ или prod_.
          </p>
        )}
      </details>
    </div>
  );
}

function ModeSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: LinkMode;
  onChange: (mode: LinkMode) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as LinkMode)}
      >
        <option value="default">Както е на страницата</option>
        <option value="stripe">Плащане със Stripe</option>
        <option value="link">Друг линк</option>
      </Select>
    </Field>
  );
}

function VisibilityToggles({
  bg,
  en,
  onBg,
  onEn,
  disabled,
}: {
  bg: boolean;
  en: boolean;
  onBg: (v: boolean) => void;
  onEn: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm font-medium text-ink">Показва се на:</span>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={bg}
          disabled={disabled}
          onChange={(e) => onBg(e.target.checked)}
        />
        българския сайт
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={en}
          disabled={disabled}
          onChange={(e) => onEn(e.target.checked)}
        />
        английския сайт
      </label>
    </div>
  );
}

function SaveButton({
  saved,
  pending,
  onClick,
  disabled,
}: {
  saved: boolean;
  pending: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
    >
      {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
      {saved ? "Запазено" : "Запази"}
    </button>
  );
}

function ButtonEditor({
  placement,
  spec,
  items,
  paymentLinks,
  catalogPending,
  catalogError,
  onSaved,
}: {
  placement: SiteCtaPlacement;
  spec: SiteButtonSpec;
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
  catalogPending: boolean;
  catalogError: string | null;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialStripeEn = stripeEn(placement);
  const initialUrlEn = (placement.button_url_en ?? "").trim();
  const [form, setForm] = useState({
    label_bg: placement.button_label_bg ?? "",
    label_en: placement.button_label_en ?? "",
    url_bg: (placement.button_url ?? "").trim(),
    url_en: initialUrlEn,
    stripe_bg: stripeBg(placement),
    stripe_en: initialStripeEn,
    mode: modeOf(stripeBg(placement), placement.button_url ?? ""),
    mode_en: modeOf(initialStripeEn, initialUrlEn),
    enabled: placement.button_enabled !== false,
    enabled_en: placement.button_enabled_en !== false,
    // English only needs its own row when it actually differs from Bulgarian.
    en_override: Boolean(
      (placement.button_label_en ?? "").trim() ||
        initialUrlEn ||
        hasStripe(initialStripeEn),
    ),
  });

  function patch(next: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...next }));
    setSaved(false);
    setError(null);
  }

  function targetFor(mode: LinkMode, stripe: StripeValue, url: string) {
    if (mode === "stripe") return { stripe, url: "" };
    if (mode === "link") return { stripe: EMPTY_STRIPE, url: url.trim() };
    return { stripe: EMPTY_STRIPE, url: "" };
  }

  function save() {
    if (form.mode === "link" && !form.url_bg.trim()) {
      setError("Попълни линка или избери „Както е на страницата“.");
      return;
    }
    if (form.mode === "stripe" && !hasStripe(form.stripe_bg)) {
      setError("Избери Stripe продукт или Payment Link.");
      return;
    }
    if (form.en_override) {
      if (form.mode_en === "link" && !form.url_en.trim()) {
        setError("Попълни английския линк.");
        return;
      }
      if (form.mode_en === "stripe" && !hasStripe(form.stripe_en)) {
        setError("Избери Stripe продукт за английския сайт.");
        return;
      }
    }

    const bg = targetFor(form.mode, form.stripe_bg, form.url_bg);
    // Without an override English falls back to the Bulgarian button, so the
    // English columns are cleared rather than left as stale leftovers.
    const en = form.en_override
      ? targetFor(form.mode_en, form.stripe_en, form.url_en)
      : { stripe: EMPTY_STRIPE, url: "" };

    setError(null);
    startTransition(async () => {
      const res = await saveCtaPlacement({
        key: placement.key,
        button_label_bg: form.label_bg,
        button_label_en: form.en_override ? form.label_en : "",
        button_url: bg.url,
        button_url_en: en.url,
        stripe_id: bg.stripe.stripe_id,
        stripe_url: bg.stripe.stripe_url,
        stripe_id_en: en.stripe.stripe_id,
        stripe_url_en: en.stripe.stripe_url,
        button_enabled: form.enabled,
        button_enabled_en: form.enabled_en,
      });
      if (!res.ok) {
        setError(res.message || "Записът не мина.");
        return;
      }
      setSaved(true);
      onSaved();
    });
  }

  return (
    <div className="space-y-4 border-t border-ink/10 bg-cream-2/20 px-4 py-4">
      <VisibilityToggles
        bg={form.enabled}
        en={form.enabled_en}
        onBg={(enabled) => patch({ enabled })}
        onEn={(enabled_en) => patch({ enabled_en })}
        disabled={pending}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Текст на бутона" hint="Празно = текстът от страницата.">
          <Input
            value={form.label_bg}
            disabled={pending}
            onChange={(e) => patch({ label_bg: e.target.value })}
            placeholder={spec.defaultLabel ?? "както е на страницата"}
          />
        </Field>
        <ModeSelect
          label="Накъде води"
          value={form.mode}
          disabled={pending}
          onChange={(mode) => patch({ mode })}
        />
      </div>

      {form.mode === "link" && (
        <Field label="Линк" hint="WhatsApp, друга страница или #секция.">
          <Input
            value={form.url_bg}
            disabled={pending}
            onChange={(e) => patch({ url_bg: e.target.value })}
            placeholder="https://wa.me/… или /bg#programs"
          />
        </Field>
      )}

      {form.mode === "stripe" && (
        <StripeTargetPicker
          value={form.stripe_bg}
          onChange={(stripe_bg) => patch({ stripe_bg })}
          items={items}
          paymentLinks={paymentLinks}
          pending={catalogPending}
          error={catalogError}
          disabled={pending}
        />
      )}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.en_override}
          disabled={pending}
          onChange={(e) => patch({ en_override: e.target.checked })}
        />
        Различен текст или линк на английския сайт
      </label>

      {form.en_override && (
        <div className="space-y-4 rounded-xl border border-ink/10 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Текст на бутона (EN)">
              <Input
                value={form.label_en}
                disabled={pending}
                onChange={(e) => patch({ label_en: e.target.value })}
                placeholder="Join today"
              />
            </Field>
            <ModeSelect
              label="Накъде води (EN)"
              value={form.mode_en}
              disabled={pending}
              onChange={(mode_en) => patch({ mode_en })}
            />
          </div>
          {form.mode_en === "link" && (
            <Field label="Линк (EN)">
              <Input
                value={form.url_en}
                disabled={pending}
                onChange={(e) => patch({ url_en: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          )}
          {form.mode_en === "stripe" && (
            <StripeTargetPicker
              value={form.stripe_en}
              onChange={(stripe_en) => patch({ stripe_en })}
              items={items}
              paymentLinks={paymentLinks}
              pending={catalogPending}
              error={catalogError}
              disabled={pending}
            />
          )}
        </div>
      )}

      {error && <p className="text-sm text-coral-600">{error}</p>}
      <SaveButton saved={saved} pending={pending} onClick={save} />
    </div>
  );
}

function OfferEditor({
  placement,
  offers,
  onSaved,
}: {
  placement: SiteCtaPlacement;
  offers: SiteProduct[];
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    offer_id: placement.offer_id ?? "",
    offer_enabled: placement.offer_enabled,
    headline_bg: placement.offer_headline_bg ?? "",
    headline_en: placement.offer_headline_en ?? "",
  });

  function patch(next: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...next }));
    setSaved(false);
    setError(null);
  }

  function save() {
    if (form.offer_enabled && !form.offer_id) {
      setError("Избери продукт или изключи офертата.");
      return;
    }
    startTransition(async () => {
      const res = await saveCtaPlacement({
        key: placement.key,
        offer_id: form.offer_id || null,
        offer_enabled: form.offer_enabled,
        offer_headline_bg: form.headline_bg,
        offer_headline_en: form.headline_en,
      });
      if (!res.ok) {
        setError(res.message || "Записът не мина.");
        return;
      }
      setSaved(true);
      onSaved();
    });
  }

  return (
    <div className="space-y-4 border-t border-ink/10 bg-cream-2/20 px-4 py-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.offer_enabled}
          disabled={pending}
          onChange={(e) => patch({ offer_enabled: e.target.checked })}
        />
        Покажи офертата
      </label>

      <Field label="Продукт">
        <Select
          value={form.offer_id}
          disabled={pending}
          onChange={(e) => patch({ offer_id: e.target.value })}
        >
          <option value="">— без оферта —</option>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title_bg}
              {!o.enabled ? " (скрит)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Заглавие (BG)" hint={`Празно = „${DEFAULT_OFFER_HEADLINE.bg}“`}>
          <Input
            value={form.headline_bg}
            disabled={pending}
            onChange={(e) => patch({ headline_bg: e.target.value })}
            placeholder={DEFAULT_OFFER_HEADLINE.bg}
          />
        </Field>
        <Field label="Заглавие (EN)">
          <Input
            value={form.headline_en}
            disabled={pending}
            onChange={(e) => patch({ headline_en: e.target.value })}
            placeholder={DEFAULT_OFFER_HEADLINE.en}
          />
        </Field>
      </div>

      {error && <p className="text-sm text-coral-600">{error}</p>}
      <SaveButton saved={saved} pending={pending} onClick={save} />
    </div>
  );
}

function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "green" | "amber";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "green" && "bg-forest-600/10 text-forest-700",
        tone === "amber" && "bg-gold-400/25 text-ink",
        tone === "muted" && "bg-ink/10 text-ink-soft",
      )}
    >
      {children}
    </span>
  );
}

function PlacementRow({
  placement,
  spec,
  offers,
  items,
  paymentLinks,
  catalogPending,
  catalogError,
  open,
  onToggle,
  onSaved,
}: {
  placement: SiteCtaPlacement;
  spec: SiteButtonSpec;
  offers: SiteProduct[];
  items: StripeCatalogItem[];
  paymentLinks: StripePaymentLinkItem[];
  catalogPending: boolean;
  catalogError: string | null;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const isOffer = spec.kind === "offer";
  const bgVisible = placement.button_enabled !== false;
  const enVisible = placement.button_enabled_en !== false;
  const stripe = stripeBg(placement);
  const mode = modeOf(stripe, placement.button_url ?? "");
  const label = (placement.button_label_bg ?? "").trim();

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink/[0.03]"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{spec.name}</span>
            {isOffer ? (
              placement.offer_enabled ? (
                <Badge tone="green">включена</Badge>
              ) : (
                <Badge>изключена</Badge>
              )
            ) : (
              <>
                {!bgVisible && !enVisible && <Badge>скрит</Badge>}
                {bgVisible && !enVisible && <Badge tone="amber">само BG</Badge>}
                {!bgVisible && enVisible && <Badge tone="amber">само EN</Badge>}
                {mode === "stripe" && (
                  <Badge tone="green">
                    плащане · {stripeName(stripe, items, paymentLinks)}
                  </Badge>
                )}
                {mode === "link" && <Badge>линк</Badge>}
              </>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-soft">
            {isOffer
              ? spec.where
              : label
                ? `„${label}“ · ${spec.where}`
                : spec.where}
          </span>
        </span>
      </button>

      {open &&
        (isOffer ? (
          <OfferEditor placement={placement} offers={offers} onSaved={onSaved} />
        ) : (
          <ButtonEditor
            placement={placement}
            spec={spec}
            items={items}
            paymentLinks={paymentLinks}
            catalogPending={catalogPending}
            catalogError={catalogError}
            onSaved={onSaved}
          />
        ))}
    </div>
  );
}

export function CtaPlacementsPanel({
  placements,
  offers,
}: {
  placements: SiteCtaPlacement[];
  offers: SiteProduct[];
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const byKey = useMemo(
    () => new Map(placements.map((p) => [p.key, p])),
    [placements],
  );
  const groups = SITE_BUTTON_GROUPS.map((group) => ({
    ...group,
    rows: group.buttons
      .map((spec) => ({ spec, placement: byKey.get(spec.key) }))
      .filter(
        (row): row is { spec: SiteButtonSpec; placement: SiteCtaPlacement } =>
          Boolean(row.placement),
      ),
  })).filter((group) => group.rows.length > 0);

  // Stripe is only read when a button actually needs a payment target.
  const needsStripe = groups.some((g) => g.rows.some((r) => r.spec.kind !== "offer"));
  const catalog = useStripeCatalog(needsStripe);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма бутони — пусни миграцията{" "}
        <code className="text-xs">044_cta_placement_buttons.sql</code> в Supabase SQL
        Editor.
      </p>
    );
  }

  const missing = SITE_BUTTON_GROUPS.flatMap((g) => g.buttons).filter(
    (spec) => !byKey.has(spec.key),
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Всеки ред е един бутон на сайта. Отвори го, за да смениш текста, къде води и
        на кой език се показва. Празни полета = както е на страницата.
      </p>

      {missing.length > 0 && (
        <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Липсват {missing.length} бутона в базата ({missing.map((m) => m.key).join(", ")}).
          Пусни <code className="text-xs">supabase/scripts/RUN_PENDING_MIGRATIONS.sql</code> в Supabase SQL
          Editor и презареди страницата.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
            {group.note && <p className="text-xs text-ink-soft">{group.note}</p>}
          </div>
          {group.rows.map(({ spec, placement }) => (
            <PlacementRow
              key={spec.key}
              spec={spec}
              placement={placement}
              offers={offers}
              items={catalog.items}
              paymentLinks={catalog.paymentLinks}
              catalogPending={catalog.pending}
              catalogError={catalog.error}
              open={openKey === spec.key}
              onToggle={() => setOpenKey(openKey === spec.key ? null : spec.key)}
              onSaved={() => router.refresh()}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function WebsiteTabs({
  tab,
  onChange,
}: {
  tab: string;
  onChange: (tab: string) => void;
}) {
  const tabs = [
    { id: "products", label: "Продукти" },
    { id: "guides", label: "Ръководства" },
    { id: "events", label: "Събития" },
    { id: "videos", label: "Видеа" },
    { id: "buttons", label: "Бутони" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-ink/10 bg-cream-2/30 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            tab === t.id
              ? "bg-forest-600 text-cream shadow-sm"
              : "text-ink-soft hover:bg-ink/5",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
