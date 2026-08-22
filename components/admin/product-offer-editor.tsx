"use client";

import { AlertTriangle, ArrowDown, Info } from "lucide-react";
import type { SiteProduct } from "@/lib/supabase/types";
import { Field, Input, Select } from "@/components/admin/fields";
import { DEFAULT_OFFER_HEADLINE } from "@/lib/site/cta-placements";
import { productHasStripePrice } from "@/lib/site/product-locale";
import { cn } from "@/lib/utils";

export type ProductOfferForm = {
  upsell_offer_id: string;
  upsell_offer_enabled: boolean;
  upsell_offer_headline_bg: string;
  upsell_offer_headline_en: string;
  downsell_offer_id: string;
  downsell_enabled: boolean;
  downsell_headline_bg: string;
  downsell_headline_en: string;
};

function hasStripePrice(product: SiteProduct, locale: "bg" | "en"): boolean {
  return productHasStripePrice(product, locale);
}

function inputLooksLikePrice(stripeId: string): boolean {
  const id = stripeId.trim();
  return id.startsWith("price_") || id.startsWith("prod_");
}

export function ProductOfferEditor({
  products,
  editingProductId,
  form,
  onChange,
  currentStripeIdBg,
  currentStripeIdEn,
}: {
  products: SiteProduct[];
  editingProductId: string | "new" | null;
  form: ProductOfferForm;
  onChange: (patch: Partial<ProductOfferForm>) => void;
  /** Raw `price_…` / `prod_…` field of the product being edited (BG). */
  currentStripeIdBg: string;
  /** Same for the English Stripe attachment. */
  currentStripeIdEn: string;
}) {
  const selectable = products.filter((p) => p.id !== editingProductId);
  const upsell = products.find((p) => p.id === form.upsell_offer_id) ?? null;
  const downsell = products.find((p) => p.id === form.downsell_offer_id) ?? null;
  const baseHasBgPrice = inputLooksLikePrice(currentStripeIdBg);
  const baseHasEnPrice = inputLooksLikePrice(currentStripeIdEn);

  const problems: string[] = [];
  if (form.upsell_offer_enabled && !upsell) {
    problems.push("Избери продукт за офертата, иначе нищо няма да се покаже.");
  }
  if (form.downsell_enabled && !downsell) {
    problems.push("Избери продукт за втората оферта.");
  }
  if (
    (form.upsell_offer_enabled || form.downsell_enabled) &&
    !baseHasBgPrice &&
    !baseHasEnPrice
  ) {
    problems.push(
      "Този продукт няма Stripe Price ID (price_… или prod_…). Без него двата продукта не могат да влязат в една сметка и офертата се пропуска.",
    );
  }
  if (form.upsell_offer_enabled && upsell) {
    if (baseHasBgPrice && !hasStripePrice(upsell, "bg")) {
      problems.push(
        `„${upsell.title_bg}“ няма български Stripe Price ID — добави ѝ price_… , за да може да се купи заедно с този продукт на /bg.`,
      );
    }
    if (baseHasEnPrice && !hasStripePrice(upsell, "en")) {
      problems.push(
        `„${upsell.title_bg}“ няма английски Stripe Price ID — без него EN посетителите не могат да вземат двата продукта в една сметка.`,
      );
    }
  }
  if (form.downsell_enabled && downsell) {
    if (baseHasBgPrice && !hasStripePrice(downsell, "bg")) {
      problems.push(`„${downsell.title_bg}“ няма български Stripe Price ID.`);
    }
    if (baseHasEnPrice && !hasStripePrice(downsell, "en")) {
      problems.push(`„${downsell.title_bg}“ няма английски Stripe Price ID.`);
    }
  }
  if (
    form.upsell_offer_id &&
    form.upsell_offer_id === form.downsell_offer_id
  ) {
    problems.push("Офертата и втората оферта са един и същ продукт — избери различни.");
  }

  return (
    <div className="space-y-4 rounded-xl border border-forest-500/25 bg-forest-50/40 p-4">
      <div>
        <p className="text-sm font-semibold text-forest-800">
          Допълнителни оферти (upsell и downsell)
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Показват се при клик върху бутона за покупка на този продукт —{" "}
          <strong>в магазина, на страниците на програмите и от продуктовите
          блокове в имейлите</strong>. Клиентът вижда офертата преди Stripe и
          може да вземе двата продукта с едно плащане.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-ink-soft">
        <Info className="h-3.5 w-3.5 shrink-0 text-forest-600" />
        <span>Купи</span>
        <span aria-hidden>→</span>
        <span className="font-semibold text-ink">Оферта</span>
        <span aria-hidden>→</span>
        <span>
          приема = <span className="font-semibold text-ink">двата продукта</span>
        </span>
        <span aria-hidden>·</span>
        <span>
          откаже = <span className="font-semibold text-ink">втора оферта</span> →
          Stripe
        </span>
      </div>

      <OfferSlot
        title="Оферта при покупка (upsell)"
        description="По-скъпо или допълващо — показва се първо."
        enabled={form.upsell_offer_enabled}
        onEnabledChange={(upsell_offer_enabled) => onChange({ upsell_offer_enabled })}
        offerId={form.upsell_offer_id}
        onOfferChange={(upsell_offer_id) => onChange({ upsell_offer_id })}
        headlineBg={form.upsell_offer_headline_bg}
        headlineEn={form.upsell_offer_headline_en}
        onHeadlineBg={(upsell_offer_headline_bg) => onChange({ upsell_offer_headline_bg })}
        onHeadlineEn={(upsell_offer_headline_en) => onChange({ upsell_offer_headline_en })}
        products={selectable}
      />

      <div className="flex items-center gap-2 pl-1 text-xs font-medium text-ink-soft">
        <ArrowDown className="h-3.5 w-3.5" />
        Ако клиентът откаже горната оферта:
      </div>

      <OfferSlot
        title="Втора оферта (downsell)"
        description="По-евтина алтернатива — последен шанс, преди да продължи към плащане."
        enabled={form.downsell_enabled}
        onEnabledChange={(downsell_enabled) => onChange({ downsell_enabled })}
        offerId={form.downsell_offer_id}
        onOfferChange={(downsell_offer_id) => onChange({ downsell_offer_id })}
        headlineBg={form.downsell_headline_bg}
        headlineEn={form.downsell_headline_en}
        onHeadlineBg={(downsell_headline_bg) => onChange({ downsell_headline_bg })}
        onHeadlineEn={(downsell_headline_en) => onChange({ downsell_headline_en })}
        products={selectable.filter((p) => p.id !== form.upsell_offer_id)}
      />

      {problems.length > 0 && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-50 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            Още нещо липсва, за да работи офертата
          </p>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-amber-900">
            {problems.map((problem) => (
              <li key={problem}>• {problem}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function OfferSlot({
  title,
  description,
  enabled,
  onEnabledChange,
  offerId,
  onOfferChange,
  headlineBg,
  headlineEn,
  onHeadlineBg,
  onHeadlineEn,
  products,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  offerId: string;
  onOfferChange: (value: string) => void;
  headlineBg: string;
  headlineEn: string;
  onHeadlineBg: (value: string) => void;
  onHeadlineEn: (value: string) => void;
  products: SiteProduct[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3.5",
        enabled ? "border-forest-500/40" : "border-ink/10",
      )}
    >
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink/25 text-forest-600 focus:ring-forest-500"
        />
        <span>
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-xs text-ink-soft">{description}</span>
        </span>
      </label>

      {enabled && (
        <div className="mt-3 space-y-3">
          <Field label="Кой продукт да се предложи">
            {products.length === 0 ? (
              <p className="text-xs text-ink-soft">
                Нужен е поне още един продукт — създай го първо.
              </p>
            ) : (
              <Select value={offerId} onChange={(e) => onOfferChange(e.target.value)}>
                <option value="">— избери продукт —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title_bg}
                    {p.price_label_bg ? ` — ${p.price_label_bg}` : ""}
                    {!p.enabled ? " (скрит)" : ""}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Текст над офертата — BG"
              hint={`Празно = „${DEFAULT_OFFER_HEADLINE.bg}“`}
            >
              <Input
                value={headlineBg}
                onChange={(e) => onHeadlineBg(e.target.value)}
                placeholder={DEFAULT_OFFER_HEADLINE.bg}
              />
            </Field>
            <Field label="Текст над офертата — EN">
              <Input
                value={headlineEn}
                onChange={(e) => onHeadlineEn(e.target.value)}
                placeholder={DEFAULT_OFFER_HEADLINE.en}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
