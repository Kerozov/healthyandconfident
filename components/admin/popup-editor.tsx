"use client";

import { useState, useTransition } from "react";
import { Save, Check } from "lucide-react";
import type { PopupConfig, Segment } from "@/lib/supabase/types";
import { savePopup } from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";

export function PopupEditor({
  popup,
  segments,
}: {
  popup: PopupConfig;
  segments: Segment[];
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    enabled: popup.enabled,
    title: popup.title,
    message: popup.message,
    cta_label: popup.cta_label,
    success_message: popup.success_message,
    image_url: popup.image_url ?? "",
    segment_tag: popup.segment_tag,
    delay_seconds: popup.delay_seconds,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await savePopup({ locale: popup.locale, ...form });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <Card
      title={popup.locale === "bg" ? "Български popup" : "English popup"}
      className="space-y-4"
    >
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Enabled (show on the {popup.locale.toUpperCase()} site)
      </label>

      <Field label="Title">
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
      </Field>
      <Field label="Message">
        <Textarea
          rows={3}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Button label">
          <Input
            value={form.cta_label}
            onChange={(e) => set("cta_label", e.target.value)}
          />
        </Field>
        <Field label="Success message">
          <Input
            value={form.success_message}
            onChange={(e) => set("success_message", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Save to segment">
          <Select
            value={form.segment_tag}
            onChange={(e) => set("segment_tag", e.target.value)}
          >
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Delay (seconds)">
          <Input
            type="number"
            min={0}
            value={form.delay_seconds}
            onChange={(e) => set("delay_seconds", Number(e.target.value))}
          />
        </Field>
      </div>
      <ImageUploadField
        label="Снимка (по избор)"
        value={form.image_url}
        onChange={(url) => set("image_url", url)}
        folder="popup"
      />

      {error && <p className="text-sm text-coral-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Saved" : "Save changes"}
      </button>
    </Card>
  );
}
