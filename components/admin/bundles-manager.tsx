"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import type { SiteBundle, SiteBlackFridayConfig } from "@/lib/supabase/types";
import {
  saveBundle,
  deleteBundle,
  moveBundle,
  saveBlackFridayConfig,
  createPlanBundles,
  type BundleInput,
} from "@/app/(admin)/admin/bundle-actions";
import {
  Field,
  Input,
  Textarea,
  Card,
  LocaleVisibilityCheckboxes,
} from "@/components/admin/fields";
import { AdminButton, Alert } from "@/components/admin/ui";
import { ImageUploadField } from "@/components/admin/image-upload-field";

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * `datetime-local` gives a wall-clock time without a zone; turn it into an
 * instant in the admin's browser zone (Sofia for Веси) before saving, so the
 * database doesn't read „30.11 23:59“ as UTC.
 */
function fromLocalInput(value: string): string {
  if (!value.trim()) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

type BundleForm = {
  slug: string;
  title_bg: string;
  title_en: string;
  subtitle_bg: string;
  subtitle_en: string;
  includes_bg: string;
  includes_en: string;
  old_price_bg: string;
  old_price_en: string;
  price_bg: string;
  price_en: string;
  bonus_bg: string;
  bonus_en: string;
  cta_label_bg: string;
  cta_label_en: string;
  stripe_url: string;
  stripe_url_en: string;
  image_url: string;
  badge_bg: string;
  badge_en: string;
  highlight: boolean;
  enabled: boolean;
  enabled_en: boolean;
};

function bundleToForm(bundle: SiteBundle | null): BundleForm {
  return {
    slug: bundle?.slug ?? "",
    title_bg: bundle?.title_bg ?? "",
    title_en: bundle?.title_en ?? "",
    subtitle_bg: bundle?.subtitle_bg ?? "",
    subtitle_en: bundle?.subtitle_en ?? "",
    includes_bg: (bundle?.includes_bg ?? []).join("\n"),
    includes_en: (bundle?.includes_en ?? []).join("\n"),
    old_price_bg: bundle?.old_price_bg ?? "",
    old_price_en: bundle?.old_price_en ?? "",
    price_bg: bundle?.price_bg ?? "",
    price_en: bundle?.price_en ?? "",
    bonus_bg: bundle?.bonus_bg ?? "",
    bonus_en: bundle?.bonus_en ?? "",
    cta_label_bg: bundle?.cta_label_bg ?? "",
    cta_label_en: bundle?.cta_label_en ?? "",
    stripe_url: bundle?.stripe_url ?? "",
    stripe_url_en: bundle?.stripe_url_en ?? "",
    image_url: bundle?.image_url ?? "",
    badge_bg: bundle?.badge_bg ?? "",
    badge_en: bundle?.badge_en ?? "",
    highlight: bundle?.highlight ?? false,
    enabled: bundle?.enabled ?? false,
    enabled_en: bundle?.enabled_en ?? false,
  };
}

function BundleEditor({
  bundle,
  isNew,
  onDone,
}: {
  bundle: SiteBundle | null;
  isNew: boolean;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BundleForm>(() => bundleToForm(bundle));

  function set<K extends keyof BundleForm>(key: K, value: BundleForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toInput(): BundleInput {
    return {
      id: bundle?.id,
      slug: form.slug,
      title_bg: form.title_bg,
      title_en: form.title_en,
      subtitle_bg: form.subtitle_bg,
      subtitle_en: form.subtitle_en,
      includes_bg: splitLines(form.includes_bg),
      includes_en: splitLines(form.includes_en),
      old_price_bg: form.old_price_bg,
      old_price_en: form.old_price_en,
      price_bg: form.price_bg,
      price_en: form.price_en,
      bonus_bg: form.bonus_bg,
      bonus_en: form.bonus_en,
      cta_label_bg: form.cta_label_bg,
      cta_label_en: form.cta_label_en,
      stripe_url: form.stripe_url,
      stripe_url_en: form.stripe_url_en,
      image_url: form.image_url,
      badge_bg: form.badge_bg,
      badge_en: form.badge_en,
      highlight: form.highlight,
      enabled: form.enabled,
      enabled_en: form.enabled_en,
    };
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveBundle(toInput());
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
      onDone();
    });
  }

  function remove() {
    if (!bundle) return;
    if (!window.confirm("Изтриваш този пакет. Сигурен ли си?")) return;
    startTransition(async () => {
      const res = await deleteBundle(bundle.id);
      if (!res.ok) setError(res.message || "Failed");
      else onDone();
    });
  }

  function move(direction: "up" | "down") {
    if (!bundle) return;
    startTransition(async () => {
      const res = await moveBundle(bundle.id, direction);
      if (!res.ok) setError(res.message || "Failed");
      else onDone();
    });
  }

  return (
    <Card
      title={bundle ? (bundle.title_bg || "Пакет") : "Нов пакет"}
      action={
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <AdminButton size="sm" variant="secondary" onClick={() => move("up")}>
                <ArrowUp className="h-4 w-4" /> Нагоре
              </AdminButton>
              <AdminButton size="sm" variant="secondary" onClick={() => move("down")}>
                <ArrowDown className="h-4 w-4" /> Надолу
              </AdminButton>
            </>
          )}
          {!isNew && (
            <AdminButton size="sm" variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </AdminButton>
          )}
        </div>
      }
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Заглавие (БГ)">
          <Input value={form.title_bg} onChange={(e) => set("title_bg", e.target.value)} />
        </Field>
        <Field label="Заглавие (EN)">
          <Input value={form.title_en} onChange={(e) => set("title_en", e.target.value)} />
        </Field>
        <Field label="Подзаглавие (БГ)">
          <Input value={form.subtitle_bg} onChange={(e) => set("subtitle_bg", e.target.value)} />
        </Field>
        <Field label="Подзаглавие (EN)">
          <Input value={form.subtitle_en} onChange={(e) => set("subtitle_en", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Какво включва (БГ) - по един ред">
          <Textarea
            rows={4}
            value={form.includes_bg}
            onChange={(e) => set("includes_bg", e.target.value)}
          />
        </Field>
        <Field label="Какво включва (EN) - по един ред">
          <Textarea
            rows={4}
            value={form.includes_en}
            onChange={(e) => set("includes_en", e.target.value)}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Стара цена (БГ)" hint="Напр. 77 € - показва се задраскана.">
          <Input value={form.old_price_bg} onChange={(e) => set("old_price_bg", e.target.value)} />
        </Field>
        <Field label="Стара цена (EN)">
          <Input value={form.old_price_en} onChange={(e) => set("old_price_en", e.target.value)} />
        </Field>
        <Field label="Нова цена (БГ)" hint="Напр. 39 €.">
          <Input value={form.price_bg} onChange={(e) => set("price_bg", e.target.value)} />
        </Field>
        <Field label="Нова цена (EN)">
          <Input value={form.price_en} onChange={(e) => set("price_en", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Бонус (БГ)" hint="Напр. „21 дни“ подарък + плащане на 2 вноски.">
          <Input value={form.bonus_bg} onChange={(e) => set("bonus_bg", e.target.value)} />
        </Field>
        <Field label="Бонус (EN)">
          <Input value={form.bonus_en} onChange={(e) => set("bonus_en", e.target.value)} />
        </Field>
        <Field label="Текст на бутона (БГ)">
          <Input value={form.cta_label_bg} onChange={(e) => set("cta_label_bg", e.target.value)} />
        </Field>
        <Field label="Текст на бутона (EN)">
          <Input value={form.cta_label_en} onChange={(e) => set("cta_label_en", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Stripe Payment Link (БГ)"
          hint="Създай го в Stripe → Payment Links и постави URL-а тук."
        >
          <Input value={form.stripe_url} onChange={(e) => set("stripe_url", e.target.value)} />
        </Field>
        <Field label="Stripe Payment Link (EN)">
          <Input value={form.stripe_url_en} onChange={(e) => set("stripe_url_en", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge (БГ)" hint="Напр. „Най-продавано“ - по избор.">
          <Input value={form.badge_bg} onChange={(e) => set("badge_bg", e.target.value)} />
        </Field>
        <Field label="Badge (EN)">
          <Input value={form.badge_en} onChange={(e) => set("badge_en", e.target.value)} />
        </Field>
      </div>

      <ImageUploadField
        label="Снимка (по избор)"
        value={form.image_url}
        onChange={(url) => set("image_url", url)}
        folder="bundles"
      />

      <div className="flex flex-wrap items-center gap-4">
        <LocaleVisibilityCheckboxes
          enabled={form.enabled}
          enabledEn={form.enabled_en}
          onEnabledChange={(v) => set("enabled", v)}
          onEnabledEnChange={(v) => set("enabled_en", v)}
        />
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.highlight}
            onChange={(e) => set("highlight", e.target.checked)}
          />
          Акцентиран (по-голям)
        </label>
      </div>

      {error && <p className="text-sm text-coral-600">{error}</p>}

      <button
        onClick={save}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Запазен" : "Запази пакета"}
      </button>
    </Card>
  );
}

function ConfigEditor({
  config,
  siteOrigin,
}: {
  config: SiteBlackFridayConfig | null;
  siteOrigin: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    enabled: config?.enabled ?? false,
    // Defaults follow the 2026 plan: offers 27.11 8:00 – 30.11 23:59.
    deadline: config ? toLocalInput(config.deadline) : "2026-11-30T23:59",
    early_access_deadline: config
      ? toLocalInput(config.early_access_deadline)
      : "2026-11-27T08:00",
    early_access_form_slug: config?.early_access_form_slug ?? "",
    banner_text_bg:
      config?.banner_text_bg ?? "Черен петък: менюта и програми до −50% до 30.11",
    banner_text_en:
      config?.banner_text_en ?? "Black Friday: menus and programs up to −50% until 30.11",
    banner_href: config?.banner_href ?? "/black-friday",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveBlackFridayConfig({
        enabled: form.enabled,
        deadline: fromLocalInput(form.deadline),
        early_access_deadline: fromLocalInput(form.early_access_deadline),
        early_access_form_slug: form.early_access_form_slug,
        banner_text_bg: form.banner_text_bg,
        banner_text_en: form.banner_text_en,
        banner_href: form.banner_href,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
    });
  }

  const earlyLink = config?.early_access_key
    ? `${siteOrigin}/bg/black-friday?early=${config.early_access_key}`
    : "";

  return (
    <Card title="Настройки на кампанията" className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Кампанията е активна (показва страницата и лентата)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Край на офертите"
          hint="След този момент цените се връщат. Времето е в българската часова зона."
        >
          <Input
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </Field>
        <Field
          label="Начало на офертите (ранен достъп)"
          hint="До този момент страницата показва само формата за ранен достъп (освен по тайния линк по-долу)."
        >
          <Input
            type="datetime-local"
            value={form.early_access_deadline}
            onChange={(e) => set("early_access_deadline", e.target.value)}
          />
        </Field>
      </div>

      {earlyLink && (
        <Field
          label="Линк за ранен достъп"
          hint="Сложи го в имейл № 3 (26.11, 20:00). Който го има, вижда офертите преди началото."
        >
          <Input readOnly value={earlyLink} onFocus={(e) => e.currentTarget.select()} />
        </Field>
      )}

      <Field
        label="Slug на формата за ранен достъп"
        hint="Името на формата в Админ → Форми. Оставено празно = няма форма."
      >
        <Input
          value={form.early_access_form_slug}
          onChange={(e) => set("early_access_form_slug", e.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Текст на лентата (БГ)">
          <Input
            value={form.banner_text_bg}
            onChange={(e) => set("banner_text_bg", e.target.value)}
          />
        </Field>
        <Field label="Текст на лентата (EN)">
          <Input
            value={form.banner_text_en}
            onChange={(e) => set("banner_text_en", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Линк на лентата" hint="Път без езика, напр. /black-friday">
        <Input value={form.banner_href} onChange={(e) => set("banner_href", e.target.value)} />
      </Field>

      {error && <p className="text-sm text-coral-600">{error}</p>}

      <button
        onClick={save}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Запазени" : "Запази настройките"}
      </button>
    </Card>
  );
}

export function BundlesManager({
  bundles,
  config,
  siteOrigin,
}: {
  bundles: SiteBundle[];
  config: SiteBlackFridayConfig | null;
  siteOrigin: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [planPending, startPlan] = useTransition();
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  function addPlanBundles() {
    setPlanMessage(null);
    startPlan(async () => {
      const res = await createPlanBundles();
      if (!res.ok) {
        setPlanMessage(res.message || "Неуспешно");
        return;
      }
      setPlanMessage(
        res.created
          ? `Добавих ${res.created} пакета като скрити чернови. Постави Stripe линковете и ги включи.`
          : "Пакетите от плана вече са добавени.",
      );
      router.refresh();
    });
  }

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ConfigEditor config={config} siteOrigin={siteOrigin} />

      {bundles.length === 0 && !creating && (
        <Alert variant="info">
          Все още няма пакети. Натисни „Добави офертите от плана“ и ще създам четирите
          оферти за Черния петък („21 дни“ за 39 €, „По-леко тяло“ за 69 €, PDF по 9 €,
          „Живей без резистентност“ с подарък) като скрити чернови. Остава само да
          поставиш Stripe линковете и да ги включиш.
        </Alert>
      )}

      {planMessage && <Alert variant="info">{planMessage}</Alert>}

      {bundles.map((bundle) => (
        <BundleEditor key={bundle.id} bundle={bundle} isNew={false} onDone={refresh} />
      ))}

      {creating && <BundleEditor bundle={null} isNew onDone={() => { setCreating(false); refresh(); }} />}

      {!creating && (
        <div className="flex flex-wrap gap-3">
          <AdminButton onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Нов пакет
          </AdminButton>
          <AdminButton variant="secondary" onClick={addPlanBundles} disabled={planPending}>
            <Sparkles className="h-4 w-4" /> Добави офертите от плана
          </AdminButton>
        </div>
      )}
    </div>
  );
}
