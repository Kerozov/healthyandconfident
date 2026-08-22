"use client";

import type { Locale } from "@/i18n/config";
import type { FormField, FormSettings, FormTheme } from "@/lib/forms/types";
import { normalizeFormFields } from "@/lib/forms/answer-tags";
import { trackMeta } from "@/lib/meta/client";
import { trackSiteLead } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

const inputClass =
  "w-full rounded-xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20";

const themeShell: Record<FormTheme, string> = {
  default:
    "border-forest-500/20 bg-gradient-to-br from-cream via-white to-cream-2/40 shadow-lg shadow-slate-800/5",
  warm: "border-gold-400/30 bg-gradient-to-br from-gold-50/80 via-white to-coral-50/30 shadow-lg shadow-gold-900/5",
  minimal: "border-ink/10 bg-white shadow-md",
};

export function DynamicForm({
  locale,
  title,
  description,
  fields,
  settings,
  prefilledEmail,
  prefilledName,
  token,
  slug,
  preview = false,
}: {
  locale: Locale;
  title: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  prefilledEmail?: string;
  prefilledName?: string;
  token?: string;
  slug: string;
  /** Admin preview — shows thank-you without writing a submission. */
  preview?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string | string[] | boolean>>(() => {
    const init: Record<string, string | string[] | boolean> = {};
    if (prefilledEmail) {
      const emailField = fields.find((f) => f.type === "email");
      if (emailField) init[emailField.id] = prefilledEmail;
    }
    if (prefilledName) {
      const nameField = fields.find(
        (f) => f.type === "text" && /name|име/i.test(f.label_bg + f.label_en),
      );
      if (nameField) init[nameField.id] = prefilledName;
    }
    return init;
  });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = settings.theme ?? "default";
  const thankYou =
    locale === "en" ? settings.thank_you_en : settings.thank_you_bg;
  const renderFields = useMemo(() => normalizeFormFields(fields), [fields]);

  function setValue(id: string, value: string | string[] | boolean) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function label(f: FormField) {
    const value = locale === "en" ? f.label_en : f.label_bg;
    return value?.trim() || f.label_bg || f.label_en;
  }

  function placeholder(f: FormField) {
    const value = locale === "en" ? f.placeholder_en : f.placeholder_bg;
    return value?.trim() || f.placeholder_bg || f.placeholder_en;
  }

  function help(f: FormField) {
    const value = locale === "en" ? f.help_en : f.help_bg;
    return value?.trim() || f.help_bg || f.help_en;
  }

  function optionLabel(opt: { label_bg: string; label_en: string }) {
    const value = locale === "en" ? opt.label_en : opt.label_bg;
    return value?.trim() || opt.label_bg || opt.label_en;
  }

  function requiredMessage() {
    return locale === "en"
      ? "Please fill all required fields."
      : "Попълни всички задължителни полета.";
  }

  function isBlank(field: FormField): boolean {
    const val = values[field.id];
    if (field.type === "checkbox") {
      return !Array.isArray(val) || val.length === 0;
    }
    if (field.type === "consent") return !val;
    if (typeof val === "string") return val.trim() === "";
    return val === undefined || val === false;
  }

  /** Email the visitor typed (or the one the invite link carried) — for ad matching. */
  function submittedEmail(): string | null {
    for (const field of renderFields) {
      if (field.type !== "email") continue;
      const value = values[field.id];
      if (typeof value === "string" && value.includes("@")) return value.trim();
    }
    return prefilledEmail?.trim() || null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrorMsg(null);

    const missing = renderFields.some(
      (field) => field.required && field.type !== "heading" && isBlank(field),
    );
    if (missing) {
      setState("error");
      setErrorMsg(requiredMessage());
      return;
    }

    if (preview) {
      setState("done");
      return;
    }

    try {
      const res = await fetch(`/api/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: values, token, locale }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Submit failed");
      trackMeta(
        "CompleteRegistration",
        { contentName: title, contentCategory: `form:${slug}` },
        { email: submittedEmail() },
      );
      trackSiteLead();
      setState("done");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="flex items-start gap-4 rounded-2xl border border-forest-500/20 bg-cream px-6 py-8">
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-forest-600" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest-800">
              {locale === "en" ? "Thank you!" : "Благодарим!"}
            </h1>
            <p className="mt-2 text-ink-soft">{thankYou}</p>
            {preview && (
              <button
                type="button"
                onClick={() => setState("idle")}
                className="mt-4 text-sm font-semibold text-forest-600 hover:text-forest-700"
              >
                {locale === "en" ? "Show form again" : "Покажи формата отново"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {preview && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Преглед — изпращането не се записва.
        </p>
      )}
      <div className={cn("rounded-3xl border p-6 sm:p-10", themeShell[theme])}>
        <header className="mb-8 text-center">
          <h1 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-soft sm:text-base">
              {description}
            </p>
          )}
        </header>

        <form onSubmit={submit} className="space-y-6">
          {renderFields.map((field) => {
            if (field.type === "heading") {
              return (
                <div key={field.id} className="border-b border-ink/10 pb-2 pt-2">
                  <h2 className="font-display text-lg font-semibold text-forest-800">
                    {label(field)}
                  </h2>
                </div>
              );
            }

            if (field.type === "consent") {
              const checked = Boolean(values[field.id]);
              return (
                <label
                  key={field.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-white/80 p-4"
                >
                  <input
                    type="checkbox"
                    required={field.required}
                    checked={checked}
                    onChange={(e) => setValue(field.id, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-ink/20 text-forest-600"
                  />
                  <span className="text-sm text-ink">
                    {label(field)}
                    {field.required && <span className="text-coral-500"> *</span>}
                    {help(field) ? (
                      <span className="mt-1 block text-xs text-ink-soft">{help(field)}</span>
                    ) : null}
                  </span>
                </label>
              );
            }

            if (field.type === "radio") {
              const options = field.options ?? [];
              return (
                <fieldset key={field.id}>
                  <legend className="mb-2 block text-sm font-medium text-ink">
                    {label(field)}
                    {field.required && <span className="text-coral-500"> *</span>}
                  </legend>
                  {help(field) && (
                    <p className="mb-3 text-xs text-ink-soft">{help(field)}</p>
                  )}
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-white/90 px-4 py-3 transition hover:border-forest-500/30"
                      >
                        <input
                          type="radio"
                          name={field.id}
                          required={field.required}
                          value={opt.value}
                          checked={values[field.id] === opt.value}
                          onChange={() => setValue(field.id, opt.value)}
                          className="h-4 w-4 text-forest-600"
                        />
                        <span className="text-sm">{optionLabel(opt)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }

            if (field.type === "checkbox") {
              const selected = (values[field.id] as string[] | undefined) ?? [];
              const options = field.options ?? [];
              return (
                <fieldset key={field.id}>
                  <legend className="mb-2 block text-sm font-medium text-ink">
                    {label(field)}
                    {field.required && <span className="text-coral-500"> *</span>}
                  </legend>
                  {help(field) && (
                    <p className="mb-3 text-xs text-ink-soft">{help(field)}</p>
                  )}
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-white/90 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(opt.value)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selected, opt.value]
                              : selected.filter((v) => v !== opt.value);
                            setValue(field.id, next);
                          }}
                          className="h-4 w-4 rounded text-forest-600"
                        />
                        <span className="text-sm">{optionLabel(opt)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }

            if (field.type === "select") {
              const options = field.options ?? [];
              return (
                <label key={field.id} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    {label(field)}
                    {field.required && <span className="text-coral-500"> *</span>}
                  </span>
                  <select
                    required={field.required}
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {locale === "en" ? "Select…" : "Избери…"}
                    </option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {optionLabel(opt)}
                      </option>
                    ))}
                  </select>
                  {help(field) && (
                    <span className="mt-1 block text-xs text-ink-soft">{help(field)}</span>
                  )}
                </label>
              );
            }

            if (field.type === "textarea") {
              return (
                <label key={field.id} className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    {label(field)}
                    {field.required && <span className="text-coral-500"> *</span>}
                  </span>
                  <textarea
                    required={field.required}
                    rows={4}
                    value={(values[field.id] as string) ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value)}
                    placeholder={placeholder(field)}
                    className={cn(inputClass, "resize-y min-h-[100px]")}
                  />
                  {help(field) && (
                    <span className="mt-1 block text-xs text-ink-soft">{help(field)}</span>
                  )}
                </label>
              );
            }

            const inputType =
              field.type === "email"
                ? "email"
                : field.type === "phone"
                  ? "tel"
                  : field.type === "number"
                    ? "number"
                    : field.type === "date"
                      ? "date"
                      : "text";

            return (
              <label key={field.id} className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  {label(field)}
                  {field.required && <span className="text-coral-500"> *</span>}
                </span>
                <input
                  type={inputType}
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  placeholder={placeholder(field)}
                  readOnly={
                    field.type === "email" &&
                    Boolean(token || (prefilledEmail && values[field.id] === prefilledEmail))
                  }
                  className={inputClass}
                />
                {help(field) && (
                  <span className="mt-1 block text-xs text-ink-soft">{help(field)}</span>
                )}
              </label>
            );
          })}

          <button
            type="submit"
            disabled={state === "loading"}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gold-400 font-bold text-forest-900 transition hover:bg-gold-500 disabled:opacity-60"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {locale === "en" ? "Sending…" : "Изпращане…"}
              </>
            ) : locale === "en" ? (
              "Submit"
            ) : (
              "Изпрати"
            )}
          </button>

          {state === "error" && errorMsg && (
            <p className="text-center text-sm text-coral-600">{errorMsg}</p>
          )}
        </form>
      </div>
    </div>
  );
}
