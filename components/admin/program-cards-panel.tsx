"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type {
  SiteCtaPlacement,
  SiteProgramCard,
  SiteSection,
} from "@/lib/supabase/types";
import {
  saveSiteProgramCard,
  deleteSiteProgramCard,
  reorderSiteProgramCards,
  clearProgramCardButtonOverride,
} from "@/app/(admin)/admin/actions";
import {
  Card,
  Field,
  Input,
  Select,
  Textarea,
  LocaleVisibilityCheckboxes,
} from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SectionToggle } from "@/components/admin/section-toggle";
import {
  PROGRAM_LINK_OPTIONS,
  isExternalProgramHref,
} from "@/lib/site/program-cards";
import { cn } from "@/lib/utils";

type CardForm = {
  badge_bg: string;
  badge_en: string;
  title_bg: string;
  title_en: string;
  duration_bg: string;
  duration_en: string;
  price_bg: string;
  price_en: string;
  description_bg: string;
  description_en: string;
  features_bg: string;
  features_en: string;
  cta_label_bg: string;
  cta_label_en: string;
  href: string;
  href_en: string;
  image_url: string;
  highlight: boolean;
  enabled: boolean;
  enabled_en: boolean;
  sort_order: number;
};

const EMPTY_CARD: CardForm = {
  badge_bg: "",
  badge_en: "",
  title_bg: "",
  title_en: "",
  duration_bg: "",
  duration_en: "",
  price_bg: "",
  price_en: "",
  description_bg: "",
  description_en: "",
  features_bg: "",
  features_en: "",
  cta_label_bg: "",
  cta_label_en: "",
  href: "",
  href_en: "",
  image_url: "",
  highlight: false,
  enabled: true,
  enabled_en: true,
  sort_order: 0,
};

const CUSTOM_PATH = "__custom__";

function formFromCard(card: SiteProgramCard): CardForm {
  return {
    badge_bg: card.badge_bg,
    badge_en: card.badge_en,
    title_bg: card.title_bg,
    title_en: card.title_en,
    duration_bg: card.duration_bg,
    duration_en: card.duration_en,
    price_bg: card.price_bg,
    price_en: card.price_en,
    description_bg: card.description_bg,
    description_en: card.description_en,
    features_bg: card.features_bg.join("\n"),
    features_en: card.features_en.join("\n"),
    cta_label_bg: card.cta_label_bg,
    cta_label_en: card.cta_label_en,
    href: card.href,
    href_en: card.href_en,
    image_url: card.image_url ?? "",
    highlight: card.highlight,
    enabled: card.enabled,
    enabled_en: card.enabled_en !== false,
    sort_order: card.sort_order,
  };
}

/**
 * Where one card's button goes: one of our pages, or a link somewhere else.
 * Both end up in the same field — the shape of the value is what decides how
 * the site renders it — so the choice is made here instead of by typing.
 */
function LinkEditor({
  label,
  hint,
  value,
  onChange,
  emptyLabel,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (href: string) => void;
  /** Offered as a choice when an empty link is meaningful (the English card). */
  emptyLabel?: string;
}) {
  const external = isExternalProgramHref(value);
  const known = PROGRAM_LINK_OPTIONS.some((o) => o.value === value);
  const [custom, setCustom] = useState(!external && value !== "" && !known);
  const mode = external ? "external" : "internal";

  function setMode(next: "internal" | "external") {
    if (next === mode) return;
    setCustom(false);
    onChange(
      next === "external"
        ? "https://"
        : emptyLabel
          ? ""
          : PROGRAM_LINK_OPTIONS[0].value,
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-cream-2/20 p-4">
      <p className="mb-3 text-sm font-medium text-ink">{label}</p>
      <div className="mb-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={mode === "internal"}
            onChange={() => setMode("internal")}
          />
          Наша страница
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={mode === "external"}
            onChange={() => setMode("external")}
          />
          Външен линк
        </label>
      </div>

      {mode === "internal" ? (
        <div className="space-y-3">
          <Select
            value={custom ? CUSTOM_PATH : value}
            onChange={(e) => {
              if (e.target.value === CUSTOM_PATH) {
                setCustom(true);
                return;
              }
              setCustom(false);
              onChange(e.target.value);
            }}
          >
            {emptyLabel ? (
              <option value="">{emptyLabel}</option>
            ) : (
              !custom && !known && value === "" && <option value="">— избери —</option>
            )}
            {PROGRAM_LINK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value={CUSTOM_PATH}>Друг адрес в сайта (ръчно)</option>
          </Select>
          {custom && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="/programs/nova-programa"
            />
          )}
          <p className="text-xs text-ink-soft">
            Езикът се добавя автоматично — „/programs/x“ отваря /bg/programs/x на
            българския сайт и /en/programs/x на английския.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-ink-soft">Външните линкове се отварят в нов таб.</p>
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/**
 * „Бутони“ edits the same button from the other side and wins at runtime, so
 * whatever is set there is named here rather than left to puzzle over.
 */
function OverrideWarning({
  placement,
  onCleared,
  disabled,
}: {
  placement: SiteCtaPlacement | undefined;
  onCleared: () => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  if (!placement) return null;

  const stripe = Boolean(
    (placement.stripe_price_id ?? "").trim() ||
      (placement.stripe_url ?? "").trim() ||
      (placement.stripe_price_id_en ?? "").trim() ||
      (placement.stripe_url_en ?? "").trim(),
  );

  const notes: string[] = [];
  const linkOverride =
    (placement.button_url ?? "").trim() || (placement.button_url_en ?? "").trim();
  const labelOverride =
    (placement.button_label_bg ?? "").trim() || (placement.button_label_en ?? "").trim();
  if (linkOverride) notes.push(`линк „${linkOverride}“`);
  if (labelOverride) notes.push(`текст „${labelOverride}“`);
  if (placement.button_enabled === false) notes.push("бутонът е скрит на /bg");
  if (placement.button_enabled_en === false) notes.push("бутонът е скрит на /en");

  if (!stripe && notes.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-gold-400/50 bg-gold-400/10 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
      <div className="min-w-0 flex-1 space-y-2">
        {stripe && (
          <p>
            Бутонът на тази картичка има <strong>продукт в Stripe</strong> (таб
            „Бутони“ → <code className="text-xs">{placement.key}</code>) и отваря
            плащане — линкът отдолу не важи, докато продуктът е избран.
          </p>
        )}
        {notes.length > 0 && (
          <>
            <p>
              В таб „Бутони“ за <code className="text-xs">{placement.key}</code> е
              записано: <strong className="break-all">{notes.join(", ")}</strong>.
              Тези настройки имат приоритет пред полетата тук.
            </p>
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() =>
                startTransition(async () => {
                  await clearProgramCardButtonOverride(placement.key);
                  onCleared();
                })
              }
              className="inline-flex h-8 items-center rounded-full border border-ink/15 bg-white px-3 text-xs font-medium hover:bg-ink/5 disabled:opacity-60"
            >
              Управлявай бутона от картичката
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ProgramCardsPanel({
  cards,
  section,
  placements,
}: {
  cards: SiteProgramCard[];
  section: SiteSection;
  placements: SiteCtaPlacement[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<CardForm>(EMPTY_CARD);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState(cards);
  const [dragId, setDragId] = useState<string | null>(null);

  if (cards !== items && !pending && !dragId) setItems(cards);

  const placementByKey = new Map(placements.map((p) => [p.key, p]));
  const editingCard =
    editingId && editingId !== "new"
      ? cards.find((c) => c.id === editingId)
      : undefined;

  function refresh() {
    router.refresh();
  }

  function set<K extends keyof CardForm>(key: K, value: CardForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setEditingId("new");
    setForm({
      ...EMPTY_CARD,
      href: PROGRAM_LINK_OPTIONS[0].value,
      sort_order: (cards.length + 1) * 10,
    });
    setError(null);
  }

  function openEdit(card: SiteProgramCard) {
    setEditingId(card.id);
    setForm(formFromCard(card));
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteProgramCard({
        id: editingId === "new" ? undefined : editingId!,
        ...form,
        features_bg: form.features_bg.split("\n"),
        features_en: form.features_en.split("\n"),
      });
      if (!res.ok) {
        setError(res.message || "Записът не мина.");
        return;
      }
      setEditingId(null);
      refresh();
    });
  }

  function remove(id: string, title: string) {
    if (!confirm(`Изтрий картичката „${title}“ от секция „Програми“?`)) return;
    startTransition(async () => {
      const res = await deleteSiteProgramCard(id);
      if (!res.ok) setError(res.message || "Изтриването не мина.");
      refresh();
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((c) => c.id === dragId);
    const to = items.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);

    startTransition(async () => {
      await reorderSiteProgramCards(next.map((c) => c.id));
      refresh();
    });
  }

  return (
    <Card
      title="Картички в секция „Програми“"
      action={
        editingId !== "new" ? (
          <button
            type="button"
            onClick={openNew}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Нова картичка
          </button>
        ) : null
      }
    >
      <p className="mb-4 text-sm text-ink-soft">
        Трите картички под „Как мога да ти помогна още днес“ на началната страница и
        на <code className="text-xs">/programs</code>. Тук се сменят текстът и
        снимката, добавя се нова картичка, скрива се стара и се избира накъде води
        бутонът. Подреждат се с влачене.
      </p>

      <SectionToggle
        section={section}
        onSaved={refresh}
        label="Покажи секцията „Програми“ на началната страница"
        titleLabelBg="Заглавие на секцията — BG"
        titleLabelEn="Заглавие на секцията — EN"
        titleHint="Празно поле оставя заглавието от сайта."
      />

      {editingId && (
        <div className="mb-6 space-y-5 rounded-xl border border-ink/10 p-4">
          {editingCard && (
            <OverrideWarning
              placement={placementByKey.get(editingCard.placement_key)}
              onCleared={refresh}
              disabled={pending}
            />
          )}

          <ImageUploadField
            label="Снимка на картичката"
            hint="Снимката не се реже — показва се цялата. Най-добре изглежда хоризонтална 4:3 (1200×900 px); при друг формат празното място се запълва с размазан фон."
            previewFrame="aspect-[4/3]"
            value={form.image_url}
            onChange={(url) => set("image_url", url)}
            folder="programs"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Заглавие — BG">
              <Input
                value={form.title_bg}
                onChange={(e) => set("title_bg", e.target.value)}
              />
            </Field>
            <Field label="Заглавие — EN" hint="Празно поле показва българското.">
              <Input
                value={form.title_en}
                onChange={(e) => set("title_en", e.target.value)}
              />
            </Field>

            <Field label="Етикет горе вляво — BG" hint="Напр. „Най-избирана“. Празно = без етикет.">
              <Input
                value={form.badge_bg}
                onChange={(e) => set("badge_bg", e.target.value)}
              />
            </Field>
            <Field label="Етикет горе вляво — EN">
              <Input
                value={form.badge_en}
                onChange={(e) => set("badge_en", e.target.value)}
              />
            </Field>

            <Field label="Продължителност — BG" hint="Напр. „3 месеца“.">
              <Input
                value={form.duration_bg}
                onChange={(e) => set("duration_bg", e.target.value)}
              />
            </Field>
            <Field label="Продължителност — EN">
              <Input
                value={form.duration_en}
                onChange={(e) => set("duration_en", e.target.value)}
              />
            </Field>

            <Field label="Цена / надпис под нея — BG" hint="Напр. „€36“ или „групова програма“.">
              <Input
                value={form.price_bg}
                onChange={(e) => set("price_bg", e.target.value)}
              />
            </Field>
            <Field label="Цена / надпис под нея — EN">
              <Input
                value={form.price_en}
                onChange={(e) => set("price_en", e.target.value)}
              />
            </Field>

            <Field label="Описание — BG">
              <Textarea
                rows={3}
                value={form.description_bg}
                onChange={(e) => set("description_bg", e.target.value)}
              />
            </Field>
            <Field label="Описание — EN">
              <Textarea
                rows={3}
                value={form.description_en}
                onChange={(e) => set("description_en", e.target.value)}
              />
            </Field>

            <Field label="Списък с чекчета — BG" hint="По един ред на точка.">
              <Textarea
                rows={4}
                value={form.features_bg}
                onChange={(e) => set("features_bg", e.target.value)}
              />
            </Field>
            <Field label="Списък с чекчета — EN" hint="По един ред на точка.">
              <Textarea
                rows={4}
                value={form.features_en}
                onChange={(e) => set("features_en", e.target.value)}
              />
            </Field>

            <Field label="Текст на бутона — BG">
              <Input
                value={form.cta_label_bg}
                onChange={(e) => set("cta_label_bg", e.target.value)}
              />
            </Field>
            <Field label="Текст на бутона — EN">
              <Input
                value={form.cta_label_en}
                onChange={(e) => set("cta_label_en", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <LinkEditor
              key={`${editingId}-href-bg`}
              label="Накъде води бутонът (български сайт)"
              value={form.href}
              onChange={(href) => set("href", href)}
            />
            <LinkEditor
              key={`${editingId}-href-en`}
              label="Накъде води бутонът (английски сайт)"
              emptyLabel="— като на българския сайт —"
              value={form.href_en}
              onChange={(href) => set("href_en", href)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.highlight}
                onChange={(e) => set("highlight", e.target.checked)}
              />
              Открои картичката (зелена рамка, по-едър бутон)
            </label>
            <LocaleVisibilityCheckboxes
              enabled={form.enabled}
              enabledEn={form.enabled_en}
              onEnabledChange={(v) => set("enabled", v)}
              onEnabledEnChange={(v) => set("enabled_en", v)}
              bgLabel="Покажи картичката на българския сайт (/bg)"
              enLabel="Покажи картичката на английския сайт (/en)"
            />
          </div>

          {error && <p className="text-sm text-coral-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !form.title_bg.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Запази
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
            >
              <X className="h-4 w-4" /> Отказ
            </button>
          </div>
        </div>
      )}

      {!editingId && error && <p className="mb-4 text-sm text-coral-600">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-ink/10 p-4 text-sm text-ink-soft">
          Няма записани картички — сайтът показва трите по подразбиране. Натисни{" "}
          <strong>Нова картичка</strong>, за да поемеш секцията оттук (или пусни
          миграция <code className="text-xs">068_site_program_cards.sql</code>, която
          вписва сегашните три).
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((card) => {
            const external = isExternalProgramHref(card.href);
            return (
              <div
                key={card.id}
                draggable={!pending}
                onDragStart={() => setDragId(card.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(card.id)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
                  dragId === card.id
                    ? "border-coral-400 opacity-60"
                    : "border-ink/10 hover:border-forest-500/30 hover:shadow-md",
                  !card.enabled && !card.enabled_en && "opacity-60",
                )}
              >
                <div className="absolute left-2 top-2 z-10 rounded-lg bg-white/90 p-1 opacity-0 shadow-sm transition group-hover:opacity-100">
                  <GripVertical className="h-4 w-4 cursor-grab text-ink-soft active:cursor-grabbing" />
                </div>
                <div className="relative aspect-[16/10] bg-forest-100">
                  {card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Sparkles className="h-10 w-10 text-forest-600/40" />
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      card.enabled ? "bg-forest-600 text-white" : "bg-ink/60 text-white",
                    )}
                  >
                    {card.enabled ? "BG" : "BG скрито"}
                  </span>
                  <span
                    className={cn(
                      "absolute right-2 top-9 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      card.enabled_en !== false
                        ? "bg-sky-700 text-white"
                        : "bg-ink/60 text-white",
                    )}
                  >
                    {card.enabled_en !== false ? "EN" : "EN скрито"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {card.highlight && (
                      <Star className="h-4 w-4 shrink-0 text-gold-600" aria-hidden />
                    )}
                    <h3 className="font-semibold text-ink">{card.title_bg}</h3>
                  </div>
                  {card.badge_bg && (
                    <p className="mt-1 text-xs text-ink-soft">{card.badge_bg}</p>
                  )}
                  {card.description_bg && (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-soft">
                      {card.description_bg}
                    </p>
                  )}
                  <p className="mt-3 inline-flex items-center gap-1 break-all text-xs text-ink-soft">
                    {external && <ExternalLink className="h-3 w-3 shrink-0" />}
                    {card.cta_label_bg || "(бутон без текст)"} → {card.href || "—"}
                  </p>
                  <div className="mt-4 flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(card.id, card.title_bg)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
