"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check } from "lucide-react";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { saveCtaPlacement } from "@/app/(admin)/admin/actions";
import { Field, Input, Select, Card } from "@/components/admin/fields";
import { DEFAULT_OFFER_HEADLINES, normalizeOfferType } from "@/lib/site/cta-placements";
import { cn } from "@/lib/utils";

function OfferSelect({
  offers,
  value,
  onChange,
}: {
  offers: SiteProduct[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Без оферта —</option>
      {offers.map((o) => (
        <option key={o.id} value={o.id}>
          [{o.offer_type === "downsell" ? "Downsell" : "Upsell"}] {o.title_bg}
          {!o.enabled ? " (скрит)" : ""}
        </option>
      ))}
    </Select>
  );
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
  const [form, setForm] = useState({
    offer_id: placement.offer_id ?? "",
    offer_headline_bg: placement.offer_headline_bg,
    offer_headline_en: placement.offer_headline_en,
    offer_enabled: placement.offer_enabled,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveCtaPlacement({
        key: placement.key,
        offer_id: form.offer_id || null,
        offer_headline_bg: form.offer_headline_bg,
        offer_headline_en: form.offer_headline_en,
        offer_enabled: form.offer_enabled,
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

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{placement.label_bg}</p>
          <p className="text-xs text-ink-soft">{placement.key}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.offer_enabled}
            onChange={(e) => {
              setForm({ ...form, offer_enabled: e.target.checked });
              setSaved(false);
            }}
          />
          Покажи оферта
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Upsell / Downsell">
          <OfferSelect
            offers={offers}
            value={form.offer_id}
            onChange={(offer_id) => {
              setForm({ ...form, offer_id });
              setSaved(false);
            }}
          />
        </Field>
        <Field
          label="Заглавие BG"
          hint={
            selected
              ? `По подразбиране: ${DEFAULT_OFFER_HEADLINES[normalizeOfferType(selected.offer_type)].bg}`
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
      </div>

      {error && <p className="mt-2 text-sm text-coral-600">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={pending || (form.offer_enabled && !form.offer_id)}
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

  if (placements.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма бутони — пусни миграцията{" "}
        <code className="text-xs">013_offers_upsell_downsell.sql</code>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        За всеки бутон на сайта избери кой upsell или downsell да се показва под/до
        него, с персонален текст.
      </p>
      {offers.length === 0 && (
        <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Първо създай поне една оферта в таб „Оферти“.
        </p>
      )}
      {placements.map((p) => (
        <PlacementEditor
          key={p.key}
          placement={p}
          offers={offers}
          onSaved={() => router.refresh()}
        />
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
    { id: "offers", label: "Оферти" },
    { id: "events", label: "Събития" },
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
