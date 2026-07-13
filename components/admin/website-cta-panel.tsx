"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check } from "lucide-react";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { saveCtaPlacement } from "@/app/(admin)/admin/actions";
import { Field, Input } from "@/components/admin/fields";
import { DEFAULT_OFFER_HEADLINE } from "@/lib/site/cta-placements";
import { isProductPlacementKey } from "@/lib/site/product-placement";
import { cn } from "@/lib/utils";

const PROGRAM_PLACEMENT_GROUPS = [
  {
    id: "programs_1",
    title: "Програма „Живей без резистентност“",
    keys: [
      "programs_1",
      "programs_1_secondary",
      "programs_1_pricing_0",
      "programs_1_pricing_1",
    ],
  },
  {
    id: "programs_2",
    title: "Програма „Препрограмирай апетита“",
    keys: [
      "programs_2",
      "programs_2_secondary",
      "programs_2_pricing_0",
      "programs_2_pricing_1",
      "programs_2_pricing_2",
    ],
  },
  {
    id: "programs_0",
    title: "Програма „Гарнитури“",
    keys: ["programs_0", "programs_0_secondary", "programs_0_pricing_0"],
  },
] as const;

const STATIC_PLACEMENT_KEYS = ["about_cta", "outcomes_cta", "leadmagnet_cta"] as const;

/** Only lead magnet uses popup offer config in this panel. */
function showsPopupOfferConfig(key: string): boolean {
  return key === "leadmagnet_cta";
}

function isButtonPlacementKey(key: string): boolean {
  if (isProductPlacementKey(key)) return false;
  if ((STATIC_PLACEMENT_KEYS as readonly string[]).includes(key)) return true;
  if (key.startsWith("programs_")) return true;
  return /^programs_\d+_(secondary|pricing_\d+)$/.test(key);
}

function groupButtonPlacements(placements: SiteCtaPlacement[]) {
  const byKey = new Map(placements.map((p) => [p.key, p]));
  const used = new Set<string>();

  const programGroups = PROGRAM_PLACEMENT_GROUPS.map((group) => ({
    title: group.title,
    placements: group.keys
      .map((key) => byKey.get(key))
      .filter((p): p is SiteCtaPlacement => {
        if (!p) return false;
        used.add(p.key);
        return true;
      }),
  })).filter((g) => g.placements.length > 0);

  const staticPlacements = STATIC_PLACEMENT_KEYS.map((key) => byKey.get(key))
    .filter((p): p is SiteCtaPlacement => {
      if (!p) return false;
      used.add(p.key);
      return true;
    });

  return { programGroups, staticPlacements };
}

function PlacementEditor({
  placement,
  offers,
  onSaved,
}: {
  placement: SiteCtaPlacement;
  offers: SiteProduct[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showPopup = showsPopupOfferConfig(placement.key);
  const [form, setForm] = useState({
    offer_id: placement.offer_id ?? "",
    offer_headline_bg: placement.offer_headline_bg,
    offer_headline_en: placement.offer_headline_en,
    offer_enabled: placement.offer_enabled,
    button_label_bg: placement.button_label_bg ?? "",
    button_label_en: placement.button_label_en ?? "",
    button_url: placement.button_url ?? "",
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCtaPlacement({
        key: placement.key,
        offer_id: showPopup ? form.offer_id || null : null,
        offer_headline_bg: showPopup ? form.offer_headline_bg : "",
        offer_headline_en: showPopup ? form.offer_headline_en : "",
        offer_enabled: showPopup ? form.offer_enabled : false,
        button_label_bg: form.button_label_bg,
        button_label_en: form.button_label_en,
        button_url: form.button_url,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
      onSaved();
      router.refresh();
    });
  }

  const selected = offers.find((o) => o.id === form.offer_id);
  const isPricing = placement.key.includes("_pricing_");

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{placement.label_bg}</p>
          <p className="text-xs text-ink-soft">{placement.key}</p>
        </div>
        {showPopup && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.offer_enabled}
              onChange={(e) => {
                setForm({ ...form, offer_enabled: e.target.checked });
                setSaved(false);
              }}
            />
            Покажи popup оферта
          </label>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field
          label="Текст на бутона (BG)"
          hint="Празно = текстът от страницата по подразбиране"
        >
          <Input
            value={form.button_label_bg}
            onChange={(e) => {
              setForm({ ...form, button_label_bg: e.target.value });
              setSaved(false);
            }}
            placeholder="Включи се днес"
          />
        </Field>
        <Field
          label="Текст на бутона (EN)"
          hint="Празно = default from page content"
        >
          <Input
            value={form.button_label_en}
            onChange={(e) => {
              setForm({ ...form, button_label_en: e.target.value });
              setSaved(false);
            }}
            placeholder="Join today"
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label="Линк на бутона"
            hint={
              isPricing
                ? "Stripe Payment Link, WhatsApp или checkout URL"
                : placement.key === "outcomes_cta"
                  ? "Calendly линк за консултация"
                  : placement.key === "leadmagnet_cta"
                    ? "Не се ползва — бутонът е от формата за имейл"
                    : "WhatsApp, #includes, Calendly или Stripe линк"
            }
          >
            <Input
              value={form.button_url}
              onChange={(e) => {
                setForm({ ...form, button_url: e.target.value });
                setSaved(false);
              }}
              placeholder={
                isPricing
                  ? "https://buy.stripe.com/…"
                  : placement.key === "outcomes_cta"
                    ? "https://calendly.com/…"
                    : "https://wa.me/…"
              }
            />
          </Field>
        </div>

        {showPopup && (
          <>
            <Field label="Продукт за popup">
              <select
                className="h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm"
                value={form.offer_id}
                onChange={(e) => {
                  setForm({ ...form, offer_id: e.target.value });
                  setSaved(false);
                }}
              >
                <option value="">— Без popup —</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.title_bg}
                    {!o.enabled ? " (скрит)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Заглавие BG"
              hint={
                selected
                  ? `По подразбиране: ${DEFAULT_OFFER_HEADLINE.bg}`
                  : "Празно = текст от офертата или по подразбиране"
              }
            >
              <Input
                value={form.offer_headline_bg}
                onChange={(e) => {
                  setForm({ ...form, offer_headline_bg: e.target.value });
                  setSaved(false);
                }}
                placeholder="Мислим, че може да ти хареса…"
              />
            </Field>
            <Field label="Заглавие EN">
              <Input
                value={form.offer_headline_en}
                onChange={(e) => {
                  setForm({ ...form, offer_headline_en: e.target.value });
                  setSaved(false);
                }}
                placeholder="We think you might like this…"
              />
            </Field>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-coral-600">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending || (showPopup && form.offer_enabled && !form.offer_id)}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
      >
        {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
        Запази
      </button>
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
  const buttonPlacements = placements.filter((p) => isButtonPlacementKey(p.key));
  const { programGroups, staticPlacements } = groupButtonPlacements(buttonPlacements);

  if (buttonPlacements.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма бутони — пусни миграцията{" "}
        <code className="text-xs">044_cta_placement_buttons.sql</code> в Supabase SQL Editor.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Текст и линк на бутоните за <strong>програмите</strong> и статичните секции (Calendly,
        WhatsApp). Stripe продуктите се добавят в таб „Продукти“ — не тук. Празни полета =
        стойностите от кода на страницата.
      </p>
      {!placements.some((p) => p.key === "programs_1_secondary") && (
        <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Липсват бутони за „Виж какво включва“ и плащане — пусни миграцията{" "}
          <code className="text-xs">044_cta_placement_buttons.sql</code> в Supabase SQL Editor
          и презареди страницата.
        </p>
      )}

      {programGroups.map((group) => (
        <div key={group.title} className="space-y-4">
          <h3 className="text-sm font-semibold text-ink">{group.title}</h3>
          {group.placements.map((p) => (
            <PlacementEditor
              key={p.key}
              placement={p}
              offers={offers}
              onSaved={() => router.refresh()}
            />
          ))}
        </div>
      ))}

      {staticPlacements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink">Статични секции на сайта</h3>
          <p className="text-xs text-ink-soft">
            „Резултати“ → Calendly за консултация. „Безплатно меню“ → без Stripe плащане.
          </p>
          {staticPlacements.map((p) => (
            <PlacementEditor
              key={p.key}
              placement={p}
              offers={offers}
              onSaved={() => router.refresh()}
            />
          ))}
        </div>
      )}
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
