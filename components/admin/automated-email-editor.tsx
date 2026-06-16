"use client";

import { useState, useTransition } from "react";
import { Save, Check } from "lucide-react";
import type { AutomatedEmail, AutomationTrigger } from "@/lib/supabase/types";
import { saveAutomatedEmail } from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Card } from "@/components/admin/fields";

const TRIGGER_META: Record<
  AutomationTrigger,
  { title: string; hint: string }
> = {
  registration: {
    title: "After registration",
    hint: "Sent once when someone signs up (popup, lead form). Not sent if the email already exists.",
  },
  purchase: {
    title: "After purchase",
    hint: 'Sent when signup uses source "purchase" (checkout / webhook). Sent every time a purchase is recorded.',
  },
};

export function AutomatedEmailEditor({ config }: { config: AutomatedEmail }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = TRIGGER_META[config.trigger];

  const [form, setForm] = useState({
    enabled: config.enabled,
    subject: config.subject,
    html: config.html,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveAutomatedEmail({
        trigger: config.trigger,
        locale: config.locale,
        ...form,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
    });
  }

  const localeLabel = config.locale === "bg" ? "Български" : "English";

  return (
    <Card title={`${meta.title} — ${localeLabel}`} className="space-y-4">
      <p className="text-sm text-ink-soft">{meta.hint}</p>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        Send this email automatically
      </label>

      <Field label="Subject" hint="Placeholders: {{name}}, {{email}}">
        <Input
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
        />
      </Field>

      <Field label="HTML body" hint="Full HTML. Use {{name}} and {{email}}.">
        <Textarea
          rows={10}
          value={form.html}
          onChange={(e) => set("html", e.target.value)}
          className="font-mono text-[13px]"
        />
      </Field>

      {error && <p className="text-sm text-coral-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-6 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Saved" : "Save"}
      </button>
    </Card>
  );
}
