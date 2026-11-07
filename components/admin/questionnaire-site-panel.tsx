"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, Loader2, Save } from "lucide-react";
import { saveQuestionnaireCta, type QuestionnaireCtaInput } from "@/app/(admin)/admin/questionnaire-actions";
import { Card, Field, Input, Select, Textarea } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminButton, Alert } from "@/components/admin/ui";
import type { QuestionnaireFormOption } from "@/lib/admin/questionnaire-report";
import {
  QUESTIONNAIRE_CTA_DEFAULTS,
  QUESTIONNAIRE_CTA_IMAGE,
} from "@/lib/site/questionnaire-cta";
import type { SiteQuestionnaireCta } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  title,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
        checked ? "border-forest-500/40 bg-forest-50" : "border-ink/10 bg-white hover:border-ink/20",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0"
      />
      <span className="text-sm">
        <span className="font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>
      </span>
    </label>
  );
}

/** Put one questionnaire in front of visitors: header menu and a card under the programmes. */
export function QuestionnaireSitePanel({
  row,
  available,
  canEdit,
  forms,
  currentFormSlug,
}: {
  row: SiteQuestionnaireCta | null;
  available: boolean;
  canEdit: boolean;
  forms: QuestionnaireFormOption[];
  currentFormSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [lang, setLang] = useState<"bg" | "en">("bg");
  const base = row ?? QUESTIONNAIRE_CTA_DEFAULTS;
  const [form, setForm] = useState<QuestionnaireCtaInput>({
    form_slug: base.form_slug || currentFormSlug,
    show_in_nav: base.show_in_nav,
    show_on_home: base.show_on_home,
    show_en: base.show_en,
    nav_label_bg: base.nav_label_bg,
    nav_label_en: base.nav_label_en,
    eyebrow_bg: base.eyebrow_bg,
    eyebrow_en: base.eyebrow_en,
    // Empty in the database means "use the default" — show the default to edit.
    title_bg: base.title_bg || QUESTIONNAIRE_CTA_DEFAULTS.title_bg,
    title_en: base.title_en || QUESTIONNAIRE_CTA_DEFAULTS.title_en,
    text_bg: base.text_bg || QUESTIONNAIRE_CTA_DEFAULTS.text_bg,
    text_en: base.text_en || QUESTIONNAIRE_CTA_DEFAULTS.text_en,
    button_bg: base.button_bg,
    button_en: base.button_en,
    image_url: base.image_url,
  });

  const disabled = pending || !canEdit || !available;
  const set = <K extends keyof QuestionnaireCtaInput>(key: K, value: QuestionnaireCtaInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const t = (key: "nav_label" | "eyebrow" | "title" | "text" | "button") =>
    form[`${key}_${lang}` as keyof QuestionnaireCtaInput] as string;
  const setT = (key: "nav_label" | "eyebrow" | "title" | "text" | "button", value: string) =>
    set(`${key}_${lang}` as keyof QuestionnaireCtaInput, value as never);

  const live = row && (row.show_in_nav || row.show_on_home) && row.form_slug;
  const liveForm = forms.find((f) => f.slug === row?.form_slug);

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveQuestionnaireCta(form);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card
      title="На сайта"
      action={
        live ? (
          <span className="rounded-full bg-forest-500/15 px-3 py-1 text-xs font-semibold text-forest-700">
            Показва се: {liveForm?.name ?? row?.form_slug}
          </span>
        ) : (
          <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink-soft">
            Не се показва
          </span>
        )
      }
    >
      <p className="-mt-2 mb-5 max-w-3xl text-sm leading-relaxed text-ink-soft">
        Входният въпросник - пункт в менюто веднага след „Програми“ и карта с бутон под
        програмите на началната страница. Бутонът отваря формата.
      </p>

      {!available && (
        <Alert variant="warning" className="mb-5">
          Блокът още не е в базата - миграция 090 се пуска при deploy.
        </Alert>
      )}
      {!canEdit && (
        <Alert variant="info" className="mb-5">
          Промени по сайта прави някой с достъп до „Уебсайт“.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Field label="Кой въпросник">
            <Select
              value={form.form_slug}
              disabled={disabled}
              onChange={(e) => set("form_slug", e.target.value)}
            >
              <option value="">- избери -</option>
              {forms.map((f) => (
                <option key={f.id} value={f.slug}>
                  {f.name}
                  {f.enabled ? "" : " (изключена)"}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={form.show_in_nav}
              onChange={(v) => set("show_in_nav", v)}
              disabled={disabled}
              title="В менюто"
              hint="Веднага след „Програми“, откроен като бутон."
            />
            <Toggle
              checked={form.show_on_home}
              onChange={(v) => set("show_on_home", v)}
              disabled={disabled}
              title="Карта под програмите"
              hint="На началната страница, със снимка и бутон."
            />
          </div>
          <Toggle
            checked={form.show_en}
            onChange={(v) => set("show_en", v)}
            disabled={disabled}
            title="И на английския сайт"
            hint="Иначе се показва само на /bg."
          />

          <div className="flex gap-1 rounded-xl bg-ink/5 p-1 text-sm font-medium" role="tablist" aria-label="Език на текстовете">
            {(["bg", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={lang === l}
                onClick={() => setLang(l)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5",
                  lang === l ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
                )}
              >
                {l === "bg" ? "Текстове на български" : "English"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="В менюто">
              <Input value={t("nav_label")} maxLength={30} disabled={disabled} onChange={(e) => setT("nav_label", e.target.value)} />
            </Field>
            <Field label="Над заглавието">
              <Input value={t("eyebrow")} maxLength={60} disabled={disabled} onChange={(e) => setT("eyebrow", e.target.value)} />
            </Field>
          </div>
          <Field label="Заглавие">
            <Input value={t("title")} maxLength={120} disabled={disabled} onChange={(e) => setT("title", e.target.value)} />
          </Field>
          <Field label="Текст">
            <Textarea value={t("text")} maxLength={400} disabled={disabled} onChange={(e) => setT("text", e.target.value)} className="min-h-[5.5rem]" />
          </Field>
          <Field label="Бутон">
            <Input value={t("button")} maxLength={40} disabled={disabled} onChange={(e) => setT("button", e.target.value)} />
          </Field>

          <ImageUploadField
            label="Снимка"
            hint="По избор. Без снимка се показва портретът на Веси."
            previewFrame="aspect-[16/10]"
            value={form.image_url ?? ""}
            onChange={(url) => set("image_url", url || null)}
            folder="forms"
          />

          {result && <Alert variant={result.ok ? "success" : "warning"}>{result.message}</Alert>}

          <AdminButton onClick={save} disabled={disabled}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Запази и покажи на сайта
          </AdminButton>
        </div>

        {/* What visitors see */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Как изглежда</p>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-forest-100 bg-cream px-4 py-3 text-xs text-slate-700">
            <span className="font-medium">Програми ▾</span>
            {form.show_in_nav && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-500/10 px-3 py-1.5 font-semibold text-forest-700">
                <ClipboardList className="h-3.5 w-3.5" /> {t("nav_label") || "Въпросник"}
              </span>
            )}
            <span>Резултати</span>
            <span>Ръководства</span>
          </div>
          <div className={cn("overflow-hidden rounded-3xl border border-forest-100 bg-white shadow-soft", !form.show_on_home && "opacity-50")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.image_url || QUESTIONNAIRE_CTA_IMAGE}
              alt=""
              className="aspect-[16/10] w-full object-cover object-[center_30%]"
            />
            <div className="p-6">
              <p className="eyebrow">
                <ClipboardList className="h-4 w-4" aria-hidden /> {t("eyebrow")}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold leading-tight text-slate-800">
                {t("title")}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("text")}</p>
              <span className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-forest-500 px-6 text-sm font-semibold text-white">
                {t("button")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
          {!form.show_on_home && (
            <p className="text-xs text-ink-soft">Картата е изключена - включи „Карта под програмите“.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
