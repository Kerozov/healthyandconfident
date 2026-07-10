"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X } from "lucide-react";
import type { SiteGuide, SiteSection } from "@/lib/supabase/types";
import { DEFAULT_SITE_SECTIONS } from "@/lib/site/defaults";
import { saveSiteGuide, deleteSiteGuide } from "@/app/(admin)/admin/actions";
import { GuideAdminGrid } from "@/components/admin/guide-admin-grid";
import { Field, Input, Textarea, Card } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";

const EMPTY_GUIDE = {
  title_bg: "",
  title_en: "",
  description_bg: "",
  description_en: "",
  stripe_url: "",
  stripe_price_id: "",
  price_label_bg: "",
  price_label_en: "",
  image_url: "",
  enabled: true,
  sort_order: 0,
};

function SectionToggle({
  section,
  onSaved,
}: {
  section: SiteSection;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    enabled: section.enabled,
    title_bg: section.title_bg,
    title_en: section.title_en,
  });

  return (
    <div className="mb-6 rounded-xl border border-ink/10 bg-cream-2/30 p-4">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
        />
        Покажи секцията на сайта
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Заглавие секция — BG">
          <Input
            value={form.title_bg}
            onChange={(e) => setForm({ ...form, title_bg: e.target.value })}
          />
        </Field>
        <Field label="Заглавие секция — EN">
          <Input
            value={form.title_en}
            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
          />
        </Field>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const { saveSiteSection } = await import("@/app/(admin)/admin/actions");
            await saveSiteSection({ key: section.key, ...form });
            onSaved();
          });
        }}
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
      >
        <Save className="h-3.5 w-3.5" /> Запази видимост
      </button>
    </div>
  );
}

export function GuidesManagerPanel({
  guides,
  section,
}: {
  guides: SiteGuide[];
  section: SiteSection;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_GUIDE);
  const guidesSection = section ?? DEFAULT_SITE_SECTIONS.guides;

  function refresh() {
    router.refresh();
  }

  function openNew() {
    setEditingId("new");
    setForm({ ...EMPTY_GUIDE, sort_order: (guides.length + 1) * 10 });
    setError(null);
  }

  function openEdit(guide: SiteGuide) {
    setEditingId(guide.id);
    setForm({
      title_bg: guide.title_bg,
      title_en: guide.title_en,
      description_bg: guide.description_bg,
      description_en: guide.description_en,
      stripe_url: guide.stripe_url,
      stripe_price_id: guide.stripe_price_id ?? "",
      price_label_bg: guide.price_label_bg,
      price_label_en: guide.price_label_en,
      image_url: guide.image_url ?? "",
      enabled: guide.enabled,
      sort_order: guide.sort_order,
    });
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteGuide({
        id: editingId === "new" ? undefined : editingId!,
        ...form,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingId(null);
      refresh();
    });
  }

  function remove(id: string, title: string) {
    if (!confirm(`Изтрий ръководство „${title}"?`)) return;
    startTransition(async () => {
      await deleteSiteGuide(id);
      refresh();
    });
  }

  return (
    <Card
      title="Ръководства"
      action={
        editingId !== "new" ? (
          <button
            type="button"
            onClick={openNew}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Ново ръководство
          </button>
        ) : null
      }
    >
      <p className="mb-4 text-sm text-ink-soft">
        PDF ръководства и дигитални продукти със Stripe линк и Price ID — показват се в секция
        „Ръководства“ на сайта.
      </p>
      <SectionToggle section={guidesSection} onSaved={refresh} />

      {editingId ? (
        <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ред">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Име — BG">
              <Input
                value={form.title_bg}
                onChange={(e) => setForm({ ...form, title_bg: e.target.value })}
              />
            </Field>
            <Field label="Име — EN">
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
            <Field label="Stripe линк">
              <Input
                value={form.stripe_url}
                onChange={(e) => setForm({ ...form, stripe_url: e.target.value })}
                placeholder="https://buy.stripe.com/..."
              />
            </Field>
            <Field label="Stripe Price ID" hint="price_… от Stripe Dashboard">
              <Input
                value={form.stripe_price_id}
                onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                placeholder="price_1ABC..."
              />
            </Field>
            <ImageUploadField
              label="Корица"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              folder="guides"
            />
            <Field label="Цена — BG">
              <Input
                value={form.price_label_bg}
                onChange={(e) => setForm({ ...form, price_label_bg: e.target.value })}
              />
            </Field>
            <Field label="Цена — EN">
              <Input
                value={form.price_label_en}
                onChange={(e) => setForm({ ...form, price_label_en: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Активно ръководство
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !form.title_bg.trim() || !form.stripe_url.trim()}
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
          {error && <p className="text-sm text-coral-600">{error}</p>}
        </div>
      ) : null}

      <GuideAdminGrid
        guides={guides}
        onEdit={openEdit}
        onDelete={remove}
        onReordered={refresh}
        disabled={pending || editingId !== null}
      />
    </Card>
  );
}
