"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Check, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { SiteContactConfig } from "@/lib/supabase/types";
import { saveSiteContactConfig } from "@/app/(admin)/admin/actions";
import { Field, Input, Select, Card } from "@/components/admin/fields";
import {
  CONTACT_LINK_ICON_OPTIONS,
  CONTACT_LINK_LIMIT,
  newContactLink,
  parseContactLinks,
  type ContactLinkIcon,
  type SiteContactLink,
} from "@/lib/site/contact-links";

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
    extra_links: parseContactLinks(config.extra_links),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function setLinks(next: SiteContactLink[]) {
    set("extra_links", next);
  }

  function updateLink(id: string, patch: Partial<SiteContactLink>) {
    setLinks(
      form.extra_links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
    );
  }

  function moveLink(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= form.extra_links.length) return;
    const next = [...form.extra_links];
    [next[index], next[target]] = [next[target], next[index]];
    setLinks(next);
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

        <div className="border-t border-ink/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Допълнителни линкове</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Показват се под Messenger / телефон / WhatsApp — в секция „Контакти“
                и във футъра. До {CONTACT_LINK_LIMIT} линка.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLinks([...form.extra_links, newContactLink()])}
              disabled={form.extra_links.length >= CONTACT_LINK_LIMIT}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Добави линк
            </button>
          </div>

          {form.extra_links.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-ink/15 p-4 text-sm text-ink-soft">
              Няма добавени линкове.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {form.extra_links.map((link, index) => (
                <li
                  key={link.id}
                  className="rounded-xl border border-ink/15 bg-white/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                      Линк {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveLink(index, -1)}
                        disabled={index === 0}
                        aria-label="Нагоре"
                        className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5 disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLink(index, 1)}
                        disabled={index === form.extra_links.length - 1}
                        aria-label="Надолу"
                        className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setLinks(form.extra_links.filter((l) => l.id !== link.id))
                        }
                        aria-label="Изтрий"
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Заглавие (малък надпис)">
                      <Input
                        value={link.label}
                        onChange={(e) => updateLink(link.id, { label: e.target.value })}
                        placeholder="Instagram"
                      />
                    </Field>
                    <Field label="Текст (показва се удебелен)">
                      <Input
                        value={link.text}
                        onChange={(e) => updateLink(link.id, { text: e.target.value })}
                        placeholder="@healthyandconfident"
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
                    <Field label="Линк">
                      <Input
                        value={link.href}
                        onChange={(e) => updateLink(link.id, { href: e.target.value })}
                        placeholder="https://instagram.com/..."
                      />
                    </Field>
                    <Field label="Икона">
                      <Select
                        value={link.icon}
                        onChange={(e) =>
                          updateLink(link.id, {
                            icon: e.target.value as ContactLinkIcon,
                          })
                        }
                      >
                        {CONTACT_LINK_ICON_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) =>
                        updateLink(link.id, { enabled: e.target.checked })
                      }
                    />
                    Показвай на сайта
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
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
