"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import type { SiteSection } from "@/lib/supabase/types";
import { saveSiteSection } from "@/app/(admin)/admin/actions";
import { Field, Input } from "@/components/admin/fields";

/** Whole-section switch plus the heading shown above it on the public page. */
export function SectionToggle({
  section,
  onSaved,
  label = "Покажи секцията на сайта",
  titleLabelBg = "Заглавие секция — BG",
  titleLabelEn = "Заглавие секция — EN",
  titleHint,
}: {
  section: SiteSection;
  onSaved: () => void;
  label?: string;
  titleLabelBg?: string;
  titleLabelEn?: string;
  titleHint?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    enabled: section.enabled,
    title_bg: section.title_bg,
    title_en: section.title_en,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteSection({ key: section.key, ...form });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
      onSaved();
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-ink/10 bg-cream-2/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => {
              setForm({ ...form, enabled: e.target.checked });
              setSaved(false);
            }}
          />
          {label}
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          Запази видимост
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={titleLabelBg} hint={titleHint}>
          <Input
            value={form.title_bg}
            onChange={(e) => {
              setForm({ ...form, title_bg: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label={titleLabelEn} hint={titleHint}>
          <Input
            value={form.title_en}
            onChange={(e) => {
              setForm({ ...form, title_en: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
      </div>
      {error && <p className="mt-2 text-sm text-coral-600">{error}</p>}
    </div>
  );
}
