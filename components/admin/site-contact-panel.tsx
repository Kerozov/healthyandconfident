"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Loader2 } from "lucide-react";
import type { SiteContactConfig } from "@/lib/supabase/types";
import { saveSiteContactConfig } from "@/app/(admin)/admin/actions";
import { Field, Input, Card } from "@/components/admin/fields";

export function SiteContactPanel({ config }: { config: SiteContactConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    messenger_url: config.messenger_url,
    messenger_enabled: config.messenger_enabled,
    email: config.email,
    phone: config.phone,
    phone_href: config.phone_href,
    whatsapp_url: config.whatsapp_url,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteContactConfig(form);
      if (!res.ok) {
        setError(res.message || "Грешка при запис");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card className="max-w-2xl">
      <h2 className="font-display text-xl font-semibold text-ink">Контакти на сайта</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Линковете в секцията „Контакти“, футъра и плаващият Messenger бутон.
      </p>

      <div className="mt-6 space-y-5">
        <Field label="Messenger линк (m.me)">
          <Input
            value={form.messenger_url}
            onChange={(e) => set("messenger_url", e.target.value)}
            placeholder="https://m.me/yourpage"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.messenger_enabled}
            onChange={(e) => set("messenger_enabled", e.target.checked)}
          />
          Показвай плаващ Messenger бутон (долу вдясно)
        </label>

        <Field label="Имейл">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="vessie@healthyandconfident.co.uk"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Телефон (показван текст)">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+44 7876 565 263"
            />
          </Field>
          <Field label="Телефон (tel: линк)">
            <Input
              value={form.phone_href}
              onChange={(e) => set("phone_href", e.target.value)}
              placeholder="tel:+447876565263"
            />
          </Field>
        </div>

        <Field label="WhatsApp / Viber линк">
          <Input
            value={form.whatsapp_url}
            onChange={(e) => set("whatsapp_url", e.target.value)}
            placeholder="https://wa.me/447876565263"
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Запазено" : "Запази"}
        </button>
      </div>
    </Card>
  );
}
