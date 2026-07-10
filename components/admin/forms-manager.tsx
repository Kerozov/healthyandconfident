"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import type { FormField, FormFieldType, FormSettings, FormTheme } from "@/lib/forms/types";
import type { FormRow } from "@/lib/admin/forms-data";
import { FORM_PRESETS } from "@/lib/forms/presets";
import {
  createFormFromPreset,
  saveFormTemplate,
  deleteFormTemplate,
  sendFormByEmail,
  getFormSubmissionsReport,
} from "@/app/(admin)/admin/actions";
import { AudiencePicker, EMPTY_AUDIENCE } from "@/components/admin/audience-picker";
import { DynamicForm } from "@/components/site/dynamic-form";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import { formatSubmissionAnswers } from "@/lib/forms/format-answers";
import { cn } from "@/lib/utils";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "email", label: "Имейл" },
  { value: "phone", label: "Телефон" },
  { value: "textarea", label: "Дълъг текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Избор (dropdown)" },
  { value: "radio", label: "Избор (бутони)" },
  { value: "checkbox", label: "Множествен избор" },
  { value: "heading", label: "Заглавие секция" },
  { value: "consent", label: "Съгласие (checkbox)" },
];

function newFieldId() {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function emptyField(type: FormFieldType): FormField {
  return {
    id: newFieldId(),
    type,
    label_bg: type === "heading" ? "Нова секция" : "Ново поле",
    label_en: type === "heading" ? "New section" : "New field",
    required: type !== "heading",
    ...(type === "select" || type === "radio" || type === "checkbox"
      ? {
          options: [
            { value: "a", label_bg: "Опция 1", label_en: "Option 1" },
            { value: "b", label_bg: "Опция 2", label_en: "Option 2" },
          ],
        }
      : {}),
  };
}

type EditorTab = "content" | "fields" | "email" | "preview" | "send";

export function FormsManager({
  forms,
  segments,
  groups,
  subscriberTags,
}: {
  forms: FormRow[];
  segments: Segment[];
  groups: SegmentGroup[];
  subscriberTags: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [tab, setTab] = useState<EditorTab>("content");
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<
    import("@/lib/forms/types").FormSubmissionRecord[] | null
  >(null);
  const [sendAudience, setSendAudience] = useState({ ...EMPTY_AUDIENCE });
  const [sendNote, setSendNote] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "" as string | undefined,
    name: "",
    slug: "",
    title_bg: "",
    title_en: "",
    description_bg: "",
    description_en: "",
    fields: [] as FormField[],
    settings: {
      theme: "default" as FormTheme,
      thank_you_bg: "Благодарим!",
      thank_you_en: "Thank you!",
      tag_on_submit: "",
    } as FormSettings,
    email_subject_bg: "",
    email_subject_en: "",
    email_intro_bg: "",
    email_intro_en: "",
    enabled: true,
  });

  function openNewFromPreset(presetKey: string) {
    const preset = FORM_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    startTransition(async () => {
      const res = await createFormFromPreset(presetKey);
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingId(res.id ?? "new");
      setTab("content");
      setForm({
        id: res.id,
        name: preset.name,
        slug: res.slug ?? preset.slug,
        title_bg: preset.title_bg,
        title_en: preset.title_en,
        description_bg: preset.description_bg,
        description_en: preset.description_en,
        fields: preset.fields,
        settings: preset.settings,
        email_subject_bg: preset.email_subject_bg,
        email_subject_en: preset.email_subject_en,
        email_intro_bg: preset.email_intro_bg,
        email_intro_en: preset.email_intro_en,
        enabled: true,
      });
      router.refresh();
    });
  }

  function openEdit(row: FormRow) {
    setEditingId(row.id);
    setTab("content");
    setForm({
      id: row.id,
      name: row.name,
      slug: row.slug,
      title_bg: row.title_bg,
      title_en: row.title_en,
      description_bg: row.description_bg,
      description_en: row.description_en,
      fields: row.fields ?? [],
      settings: row.settings ?? {
        theme: "default",
        thank_you_bg: "",
        thank_you_en: "",
      },
      email_subject_bg: row.email_subject_bg,
      email_subject_en: row.email_subject_en,
      email_intro_bg: row.email_intro_bg,
      email_intro_en: row.email_intro_en,
      enabled: row.enabled,
    });
    setError(null);
  }

  function closeEditor() {
    setEditingId(null);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveFormTemplate(form);
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      closeEditor();
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Изтрий форма „${name}"?`)) return;
    startTransition(async () => {
      await deleteFormTemplate(id);
      router.refresh();
    });
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...form.fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...form, fields: next });
  }

  async function toggleSubmissions(formId: string) {
    if (expandedId === formId) {
      setExpandedId(null);
      setSubmissions(null);
      return;
    }
    setExpandedId(formId);
    const res = await getFormSubmissionsReport(formId);
    setSubmissions(res.ok ? res.submissions : []);
  }

  function sendForm(formId: string) {
    setSendNote(null);
    startTransition(async () => {
      const res = await sendFormByEmail({ formId, audience: sendAudience });
      setSendNote(res.message ?? (res.ok ? "Изпратено." : "Грешка."));
      router.refresh();
    });
  }

  const publicBase = process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteConfig.domain;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft max-w-2xl">
          Създавай форми от готови шаблони, редактирай въпросите и изпращай линк по
          имейл до избрана аудитория. Отговорите са под всеки формуляр — бутон{" "}
          <strong className="text-slate-800">„Отговори“</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {FORM_PRESETS.filter((p) => p.key !== "blank").map((preset) => (
            <button
              key={preset.key}
              type="button"
              disabled={pending || editingId !== null}
              onClick={() => openNewFromPreset(preset.key)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" />
              {preset.name}
            </button>
          ))}
          <button
            type="button"
            disabled={pending || editingId !== null}
            onClick={() => openNewFromPreset("blank")}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gold-400 px-5 font-semibold text-forest-900 hover:bg-gold-500 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Празна форма
          </button>
        </div>
      </div>

      {editingId && (
        <Card title={editingId === "new" ? "Нова форма" : `Редакция: ${form.name}`}>
          <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-ink/15 bg-cream-2/30 p-1">
            {(
              [
                ["content", "Съдържание"],
                ["fields", "Въпроси"],
                ["email", "Имейл"],
                ["preview", "Преглед"],
                ...(editingId !== "new" ? [["send", "Изпрати"]] : []),
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key as EditorTab)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold",
                  tab === key ? "bg-forest-600 text-cream" : "text-ink-soft hover:bg-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "content" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Име (админ)">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="URL slug" hint={`${publicBase}/bg/forms/${form.slug || "…"}`}>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
              <Field label="Заглавие — BG">
                <Input
                  value={form.title_bg}
                  onChange={(e) => setForm({ ...form, title_bg: e.target.value })}
                />
              </Field>
              <Field label="Заглавие — EN">
                <Input
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                />
              </Field>
              <Field label="Описание — BG">
                <Textarea
                  rows={3}
                  value={form.description_bg}
                  onChange={(e) => setForm({ ...form, description_bg: e.target.value })}
                />
              </Field>
              <Field label="Описание — EN">
                <Textarea
                  rows={3}
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                />
              </Field>
              <Field label="Тема / визия">
                <Select
                  value={form.settings.theme}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      settings: { ...form.settings, theme: e.target.value as FormTheme },
                    })
                  }
                >
                  <option value="default">Класическа (зелено)</option>
                  <option value="warm">Топла (златна)</option>
                  <option value="minimal">Минимална</option>
                </Select>
              </Field>
              <Field label="Тag при submit (по избор)">
                <Input
                  value={form.settings.tag_on_submit ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      settings: { ...form.settings, tag_on_submit: e.target.value },
                    })
                  }
                  placeholder="questionnaire-done"
                />
              </Field>
              <Field label="Благодарност — BG">
                <Input
                  value={form.settings.thank_you_bg}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      settings: { ...form.settings, thank_you_bg: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Благодарност — EN">
                <Input
                  value={form.settings.thank_you_en}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      settings: { ...form.settings, thank_you_en: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
          )}

          {tab === "fields" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, fields: [...form.fields, emptyField(t.value)] })
                    }
                    className="rounded-full border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-ink/5"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {form.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-xl border border-ink/10 bg-cream-2/20 p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase text-ink-soft">
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveField(index, -1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-ink/5"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveField(index, 1)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-ink/5"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              fields: form.fields.filter((f) => f.id !== field.id),
                            })
                          }
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-coral-600 hover:bg-coral-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Етикет BG">
                        <Input
                          value={field.label_bg}
                          onChange={(e) => {
                            const fields = [...form.fields];
                            fields[index] = { ...field, label_bg: e.target.value };
                            setForm({ ...form, fields });
                          }}
                        />
                      </Field>
                      <Field label="Етикет EN">
                        <Input
                          value={field.label_en}
                          onChange={(e) => {
                            const fields = [...form.fields];
                            fields[index] = { ...field, label_en: e.target.value };
                            setForm({ ...form, fields });
                          }}
                        />
                      </Field>
                      {field.type !== "heading" && field.type !== "consent" && (
                        <>
                          <Field label="Placeholder BG">
                            <Input
                              value={field.placeholder_bg ?? ""}
                              onChange={(e) => {
                                const fields = [...form.fields];
                                fields[index] = { ...field, placeholder_bg: e.target.value };
                                setForm({ ...form, fields });
                              }}
                            />
                          </Field>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required ?? false}
                              onChange={(e) => {
                                const fields = [...form.fields];
                                fields[index] = { ...field, required: e.target.checked };
                                setForm({ ...form, fields });
                              }}
                            />
                            Задължително
                          </label>
                        </>
                      )}
                      {(field.type === "select" ||
                        field.type === "radio" ||
                        field.type === "checkbox") && (
                        <div className="md:col-span-2">
                          <Field label="Опции (value | BG | EN, по ред)">
                            <Textarea
                              rows={3}
                              value={(field.options ?? [])
                                .map((o) => `${o.value}|${o.label_bg}|${o.label_en}`)
                                .join("\n")}
                              onChange={(e) => {
                                const options = e.target.value
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter(Boolean)
                                  .map((line) => {
                                    const [value, label_bg, label_en] = line.split("|");
                                    return {
                                      value: value?.trim() || "x",
                                      label_bg: label_bg?.trim() || value?.trim() || "",
                                      label_en: label_en?.trim() || label_bg?.trim() || "",
                                    };
                                  });
                                const fields = [...form.fields];
                                fields[index] = { ...field, options };
                                setForm({ ...form, fields });
                              }}
                              placeholder="weight|Отслабване|Weight loss"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "email" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Тема имейл — BG">
                <Input
                  value={form.email_subject_bg}
                  onChange={(e) => setForm({ ...form, email_subject_bg: e.target.value })}
                />
              </Field>
              <Field label="Тема имейл — EN">
                <Input
                  value={form.email_subject_en}
                  onChange={(e) => setForm({ ...form, email_subject_en: e.target.value })}
                />
              </Field>
              <Field label="Текст имейл — BG" hint="{{name}}, {{email}}">
                <Textarea
                  rows={5}
                  value={form.email_intro_bg}
                  onChange={(e) => setForm({ ...form, email_intro_bg: e.target.value })}
                />
              </Field>
              <Field label="Текст имейл — EN">
                <Textarea
                  rows={5}
                  value={form.email_intro_en}
                  onChange={(e) => setForm({ ...form, email_intro_en: e.target.value })}
                />
              </Field>
              <p className="md:col-span-2 text-xs text-ink-soft">
                Бутонът в имейла води към формата с персонален линк за всеки получател.
              </p>
            </div>
          )}

          {tab === "preview" && (
            <div className="rounded-2xl border border-ink/10 bg-cream-2/30 p-4">
              <DynamicForm
                locale="bg"
                title={form.title_bg || form.name}
                description={form.description_bg}
                fields={form.fields}
                settings={form.settings}
                slug={form.slug || "preview"}
              />
            </div>
          )}

          {tab === "send" && form.id && (
            <div className="space-y-4">
              <AudiencePicker
                segments={segments}
                groups={groups}
                subscriberTags={subscriberTags}
                value={sendAudience}
                onChange={setSendAudience}
              />
              {sendNote && <p className="text-sm text-ink-soft">{sendNote}</p>}
              <button
                type="button"
                disabled={pending}
                onClick={() => sendForm(form.id!)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-6 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> Изпрати формата по имейл
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-coral-600">{error}</p>}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !form.name.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-6 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Запази
            </button>
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
            >
              <X className="h-4 w-4" /> Отказ
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {forms.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-soft">
              Няма форми. Избери шаблон горе или създай празна форма.
            </p>
          </Card>
        ) : (
          forms.map((f) => (
            <div key={f.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{f.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        f.enabled
                          ? "bg-forest-500/15 text-forest-600"
                          : "bg-ink/10 text-ink-soft",
                      )}
                    >
                      {f.enabled ? "Активна" : "Скрита"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    /forms/{f.slug} · {f.fields?.length ?? 0} въпроса ·{" "}
                    {f.submission_count} отговора · {f.invitation_count} изпратени
                  </p>
                </div>
                <div className="flex gap-1">
                  <a
                    href={`${publicBase}/bg/forms/${f.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => openEdit(f)}
                    disabled={pending || editingId !== null}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-ink/5"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.id, f.name)}
                    disabled={pending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-coral-600 hover:bg-coral-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSubmissions(f.id)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
              >
                {expandedId === f.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Отговори ({f.submission_count})
              </button>
              {expandedId === f.id && submissions && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10">
                  {submissions.length === 0 ? (
                    <p className="p-4 text-sm text-ink-soft">Няма отговори още.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink-soft">
                          <th className="px-4 py-2">Имейл</th>
                          <th className="px-4 py-2">Дата</th>
                          <th className="px-4 py-2">Отговори</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissions.map((s) => (
                          <tr key={s.id} className="border-b border-ink/5 align-top">
                            <td className="px-4 py-2 font-mono text-xs">{s.email ?? "—"}</td>
                            <td className="px-4 py-2 text-xs text-ink-soft">
                              {formatDate(s.submitted_at, "bg")}
                            </td>
                            <td className="px-4 py-2 text-xs">
                              <ul className="max-w-xl space-y-1">
                                {formatSubmissionAnswers(f.fields ?? [], s.answers).map(
                                  (row) => (
                                    <li key={`${s.id}-${row.label}`}>
                                      <span className="font-medium text-slate-700">
                                        {row.label}:
                                      </span>{" "}
                                      <span className="text-ink-soft">{row.value}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
