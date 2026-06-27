"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  Calendar,
  ShoppingBag,
} from "lucide-react";
import type { SiteEvent, SiteProduct, SiteSection } from "@/lib/supabase/types";
import { DEFAULT_SITE_SECTIONS } from "@/lib/site/content";
import {
  saveSiteSection,
  saveSiteEvent,
  deleteSiteEvent,
  saveSiteProduct,
  deleteSiteProduct,
} from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Card } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteSection({
        key: section.key,
        ...form,
      });
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
          Show section on website
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-forest-600 px-4 text-xs font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          Save visibility
        </button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Section title — BG">
          <Input
            value={form.title_bg}
            onChange={(e) => {
              setForm({ ...form, title_bg: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Section title — EN">
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

const EMPTY_EVENT = {
  title_bg: "",
  title_en: "",
  description_bg: "",
  description_en: "",
  url: "",
  image_url: "",
  event_date: "",
  enabled: true,
  sort_order: 0,
};

const EMPTY_PRODUCT = {
  title_bg: "",
  title_en: "",
  description_bg: "",
  description_en: "",
  stripe_url: "",
  price_label_bg: "",
  price_label_en: "",
  image_url: "",
  enabled: true,
  sort_order: 0,
};

export function WebsiteManager({
  sections,
  events,
  products,
  dbReady = true,
  dbError,
}: {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  dbReady?: boolean;
  dbError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | "new" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | "new" | null>(
    null,
  );
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);

  const eventsSection = sections.events ?? DEFAULT_SITE_SECTIONS.events;
  const productsSection = sections.products ?? DEFAULT_SITE_SECTIONS.products;

  function refresh() {
    router.refresh();
  }

  function openNewEvent() {
    setEditingEventId("new");
    setEventForm({ ...EMPTY_EVENT, sort_order: (events.length + 1) * 10 });
    setError(null);
  }

  function openEditEvent(event: SiteEvent) {
    setEditingEventId(event.id);
    setEventForm({
      title_bg: event.title_bg,
      title_en: event.title_en,
      description_bg: event.description_bg,
      description_en: event.description_en,
      url: event.url,
      image_url: event.image_url ?? "",
      event_date: event.event_date ?? "",
      enabled: event.enabled,
      sort_order: event.sort_order,
    });
    setError(null);
  }

  function saveEvent() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteEvent({
        id: editingEventId === "new" ? undefined : editingEventId!,
        ...eventForm,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingEventId(null);
      refresh();
    });
  }

  function removeEvent(id: string, title: string) {
    if (!confirm(`Delete event "${title}"?`)) return;
    startTransition(async () => {
      await deleteSiteEvent(id);
      refresh();
    });
  }

  function openNewProduct() {
    setEditingProductId("new");
    setProductForm({ ...EMPTY_PRODUCT, sort_order: (products.length + 1) * 10 });
    setError(null);
  }

  function openEditProduct(product: SiteProduct) {
    setEditingProductId(product.id);
    setProductForm({
      title_bg: product.title_bg,
      title_en: product.title_en,
      description_bg: product.description_bg,
      description_en: product.description_en,
      stripe_url: product.stripe_url,
      price_label_bg: product.price_label_bg,
      price_label_en: product.price_label_en,
      image_url: product.image_url ?? "",
      enabled: product.enabled,
      sort_order: product.sort_order,
    });
    setError(null);
  }

  function saveProduct() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteProduct({
        id: editingProductId === "new" ? undefined : editingProductId!,
        ...productForm,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingProductId(null);
      refresh();
    });
  }

  function removeProduct(id: string, title: string) {
    if (!confirm(`Delete product "${title}"?`)) return;
    startTransition(async () => {
      await deleteSiteProduct(id);
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      {!dbReady && (
        <div className="rounded-2xl border border-coral-400/40 bg-coral-500/10 px-5 py-4 text-sm text-ink">
          <p className="font-semibold text-coral-700">Първо пусни миграцията в Supabase</p>
          <p className="mt-1 text-ink-soft">
            Отвори Supabase → SQL Editor и изпълни файла{" "}
            <code className="text-xs">supabase/migrations/012_site_content_and_send_date.sql</code>
            . След това презареди тази страница.
          </p>
          {dbError && (
            <p className="mt-2 font-mono text-xs text-coral-600">{dbError}</p>
          )}
        </div>
      )}

      <Card title="Предстоящи събития">
          <p className="mb-4 text-sm text-ink-soft">
            Add links to registration pages or event landing pages. They appear as
            cards on the homepage when the section is visible.
          </p>
          <SectionToggle section={eventsSection} onSaved={refresh} />

          {editingEventId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title — BG">
                  <Input
                    value={eventForm.title_bg}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Title — EN">
                  <Input
                    value={eventForm.title_en}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description — BG">
                  <Textarea
                    rows={3}
                    value={eventForm.description_bg}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, description_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description — EN">
                  <Textarea
                    rows={3}
                    value={eventForm.description_en}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, description_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Link URL" hint="Full URL to the event page.">
                  <Input
                    value={eventForm.url}
                    onChange={(e) => setEventForm({ ...eventForm, url: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Event date (optional)" hint="Shown on the card.">
                  <Input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, event_date: e.target.value })
                    }
                  />
                </Field>
                <Field label="Image URL (optional)">
                  <Input
                    value={eventForm.image_url}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, image_url: e.target.value })
                    }
                  />
                </Field>
                <Field label="Order">
                  <Input
                    type="number"
                    value={eventForm.sort_order}
                    onChange={(e) =>
                      setEventForm({
                        ...eventForm,
                        sort_order: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={eventForm.enabled}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, enabled: e.target.checked })
                  }
                />
                Show this card
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEvent}
                  disabled={
                    pending || !eventForm.title_bg || !eventForm.title_en || !eventForm.url
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> Save event
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEventId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNewEvent}
              disabled={pending}
              className="mb-4 inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add event
            </button>
          )}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {events.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">No events yet.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Calendar className="h-4 w-4 text-forest-600" />
                      <p className="font-medium">{event.title_bg}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          event.enabled
                            ? "bg-forest-500/15 text-forest-600"
                            : "bg-ink/10 text-ink-soft",
                        )}
                      >
                        {event.enabled ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {event.url}
                      {event.event_date ? ` · ${event.event_date}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditEvent(event)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeEvent(event.id, event.title_bg)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      <Card title="Upsell / Stripe продукти">
          <p className="mb-4 text-sm text-ink-soft">
            Add Stripe Payment Links. They appear as purchase cards when the section
            is visible on the homepage.
          </p>
          <SectionToggle section={productsSection} onSaved={refresh} />

          {editingProductId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title — BG">
                  <Input
                    value={productForm.title_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, title_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Title — EN">
                  <Input
                    value={productForm.title_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, title_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description — BG">
                  <Textarea
                    rows={3}
                    value={productForm.description_bg}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description_bg: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Description — EN">
                  <Textarea
                    rows={3}
                    value={productForm.description_en}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description_en: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Stripe payment link">
                  <Input
                    value={productForm.stripe_url}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stripe_url: e.target.value })
                    }
                    placeholder="https://buy.stripe.com/..."
                  />
                </Field>
                <Field label="Image URL (optional)">
                  <Input
                    value={productForm.image_url}
                    onChange={(e) =>
                      setProductForm({ ...productForm, image_url: e.target.value })
                    }
                  />
                </Field>
                <Field label="Price label — BG" hint='e.g. "49 €"'>
                  <Input
                    value={productForm.price_label_bg}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price_label_bg: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Price label — EN">
                  <Input
                    value={productForm.price_label_en}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        price_label_en: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Order">
                  <Input
                    type="number"
                    value={productForm.sort_order}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        sort_order: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={productForm.enabled}
                  onChange={(e) =>
                    setProductForm({ ...productForm, enabled: e.target.checked })
                  }
                />
                Show this card
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveProduct}
                  disabled={
                    pending ||
                    !productForm.title_bg ||
                    !productForm.title_en ||
                    !productForm.stripe_url
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> Save product
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProductId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNewProduct}
              disabled={pending}
              className="mb-4 inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add product
            </button>
          )}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {products.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">No products yet.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-coral-500" />
                      <p className="font-medium">{product.title_bg}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          product.enabled
                            ? "bg-forest-500/15 text-forest-600"
                            : "bg-ink/10 text-ink-soft",
                        )}
                      >
                        {product.enabled ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {product.stripe_url}
                      {product.price_label_bg ? ` · ${product.price_label_bg}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditProduct(product)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeProduct(product.id, product.title_bg)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      {error && <p className="text-sm text-coral-600">{error}</p>}
    </div>
  );
}
