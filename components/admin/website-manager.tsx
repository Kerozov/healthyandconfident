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
import type { SiteCtaPlacement, SiteEvent, SiteProduct, SiteSection } from "@/lib/supabase/types";
import { DEFAULT_SITE_SECTIONS } from "@/lib/site/defaults";
import { DEFAULT_OFFER_HEADLINES } from "@/lib/site/cta-placements";
import { CtaPlacementsPanel, WebsiteTabs } from "@/components/admin/website-cta-panel";
import {
  saveSiteSection,
  saveSiteEvent,
  deleteSiteEvent,
  saveSiteProduct,
  deleteSiteProduct,
} from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
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
          Покажи секцията на сайта
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
        <Field label="Заглавие секция — BG">
          <Input
            value={form.title_bg}
            onChange={(e) => {
              setForm({ ...form, title_bg: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Заглавие секция — EN">
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

function OfferPicker({
  offers,
  value,
  onChange,
}: {
  offers: SiteProduct[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Без оферта —</option>
      {offers.map((o) => (
        <option key={o.id} value={o.id}>
          [{o.offer_type === "downsell" ? "Downsell" : "Upsell"}] {o.title_bg}
          {!o.enabled ? " (скрит)" : ""}
        </option>
      ))}
    </Select>
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
  offer_id: "",
  offer_headline_bg: "",
  offer_headline_en: "",
  offer_enabled: false,
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
  offer_type: "upsell" as "upsell" | "downsell",
  headline_bg: "",
  headline_en: "",
  cta_label_bg: "",
  cta_label_en: "",
  enabled: true,
  sort_order: 0,
};

export function WebsiteManager({
  sections,
  events,
  products,
  ctaPlacements,
  dbReady = true,
  dbError,
}: {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  ctaPlacements: SiteCtaPlacement[];
  dbReady?: boolean;
  dbError?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("offers");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | "new" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | "new" | null>(null);
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
      offer_id: event.offer_id ?? "",
      offer_headline_bg: event.offer_headline_bg ?? "",
      offer_headline_en: event.offer_headline_en ?? "",
      offer_enabled: event.offer_enabled ?? false,
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
        offer_id: eventForm.offer_id || null,
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
    if (!confirm(`Изтрий събитие „${title}"?`)) return;
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
      offer_type: product.offer_type ?? "upsell",
      headline_bg: product.headline_bg ?? "",
      headline_en: product.headline_en ?? "",
      cta_label_bg: product.cta_label_bg ?? "",
      cta_label_en: product.cta_label_en ?? "",
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
    if (!confirm(`Изтрий оферта „${title}"?`)) return;
    startTransition(async () => {
      await deleteSiteProduct(id);
      refresh();
    });
  }

  const selectedEventOffer = products.find((p) => p.id === eventForm.offer_id);

  return (
    <div className="space-y-6">
      {!dbReady && (
        <div className="rounded-2xl border border-coral-400/40 bg-coral-500/10 px-5 py-4 text-sm text-ink">
          <p className="font-semibold text-coral-700">Първо пусни миграцията в Supabase</p>
          <p className="mt-1 text-ink-soft">
            Изпълни{" "}
            <code className="text-xs">supabase/migrations/013_offers_upsell_downsell.sql</code>{" "}
            (и 012 ако още не си).
          </p>
          {dbError && <p className="mt-2 font-mono text-xs text-coral-600">{dbError}</p>}
        </div>
      )}

      <WebsiteTabs tab={tab} onChange={setTab} />

      {tab === "offers" && (
        <Card title="Upsell / Downsell оферти">
          <p className="mb-4 text-sm text-ink-soft">
            Каталог от оферти със Stripe линк. Използват се на началната страница, при
            събития и до бутоните.
          </p>
          <SectionToggle section={productsSection} onSaved={refresh} />

          {editingProductId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Тип">
                  <Select
                    value={productForm.offer_type}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        offer_type: e.target.value as "upsell" | "downsell",
                      })
                    }
                  >
                    <option value="upsell">Upsell</option>
                    <option value="downsell">Downsell</option>
                  </Select>
                </Field>
                <Field label="Ред">
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
                <Field label="Име — BG">
                  <Input
                    value={productForm.title_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, title_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Име — EN">
                  <Input
                    value={productForm.title_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, title_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Описание — BG">
                  <Textarea
                    rows={3}
                    value={productForm.description_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, description_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Описание — EN">
                  <Textarea
                    rows={3}
                    value={productForm.description_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, description_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Stripe линк">
                  <Input
                    value={productForm.stripe_url}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stripe_url: e.target.value })
                    }
                    placeholder="https://buy.stripe.com/..."
                  />
                </Field>
                <Field label="Снимка URL">
                  <Input
                    value={productForm.image_url}
                    onChange={(e) =>
                      setProductForm({ ...productForm, image_url: e.target.value })
                    }
                  />
                </Field>
                <Field label="Цена — BG">
                  <Input
                    value={productForm.price_label_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price_label_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Цена — EN">
                  <Input
                    value={productForm.price_label_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, price_label_en: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Заглавие по подразбиране — BG"
                  hint={`Празно = ${DEFAULT_OFFER_HEADLINES[productForm.offer_type].bg}`}
                >
                  <Input
                    value={productForm.headline_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, headline_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Заглавие по подразбиране — EN">
                  <Input
                    value={productForm.headline_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, headline_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Бутон — BG">
                  <Input
                    value={productForm.cta_label_bg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, cta_label_bg: e.target.value })
                    }
                    placeholder="Виж офертата"
                  />
                </Field>
                <Field label="Бутон — EN">
                  <Input
                    value={productForm.cta_label_en}
                    onChange={(e) =>
                      setProductForm({ ...productForm, cta_label_en: e.target.value })
                    }
                    placeholder="View offer"
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
                Активна оферта
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
                  <Save className="h-4 w-4" /> Запази
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProductId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
                >
                  <X className="h-4 w-4" /> Отказ
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
              <Plus className="h-4 w-4" /> Нова оферта
            </button>
          )}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {products.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Няма оферти.</p>
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
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-medium uppercase">
                        {product.offer_type ?? "upsell"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          product.enabled
                            ? "bg-forest-500/15 text-forest-600"
                            : "bg-ink/10 text-ink-soft",
                        )}
                      >
                        {product.enabled ? "Активна" : "Скрита"}
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
      )}

      {tab === "events" && (
        <Card title="Предстоящи събития">
          <p className="mb-4 text-sm text-ink-soft">
            Всяко събитие може да показва upsell/downsell с персонален текст.
          </p>
          <SectionToggle section={eventsSection} onSaved={refresh} />

          {editingEventId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Заглавие — BG">
                  <Input
                    value={eventForm.title_bg}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Заглавие — EN">
                  <Input
                    value={eventForm.title_en}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, title_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Описание — BG">
                  <Textarea
                    rows={3}
                    value={eventForm.description_bg}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, description_bg: e.target.value })
                    }
                  />
                </Field>
                <Field label="Описание — EN">
                  <Textarea
                    rows={3}
                    value={eventForm.description_en}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, description_en: e.target.value })
                    }
                  />
                </Field>
                <Field label="Линк към събитието">
                  <Input
                    value={eventForm.url}
                    onChange={(e) => setEventForm({ ...eventForm, url: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Дата">
                  <Input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, event_date: e.target.value })
                    }
                  />
                </Field>
                <Field label="Снимка URL">
                  <Input
                    value={eventForm.image_url}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, image_url: e.target.value })
                    }
                  />
                </Field>
                <Field label="Ред">
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

              <div className="rounded-xl border border-coral-400/20 bg-coral-500/5 p-4 space-y-4">
                <p className="text-sm font-semibold">Upsell / Downsell при това събитие</p>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={eventForm.offer_enabled}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, offer_enabled: e.target.checked })
                    }
                  />
                  Покажи оферта на картичката
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Коя оферта">
                    <OfferPicker
                      offers={products}
                      value={eventForm.offer_id}
                      onChange={(offer_id) => setEventForm({ ...eventForm, offer_id })}
                    />
                  </Field>
                  <Field
                    label="Текст BG"
                    hint={
                      selectedEventOffer
                        ? `По подразбиране: ${DEFAULT_OFFER_HEADLINES[selectedEventOffer.offer_type ?? "upsell"].bg}`
                        : undefined
                    }
                  >
                    <Input
                      value={eventForm.offer_headline_bg}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, offer_headline_bg: e.target.value })
                      }
                      placeholder="Мислим, че може да ти хареса…"
                    />
                  </Field>
                  <Field label="Текст EN">
                    <Input
                      value={eventForm.offer_headline_en}
                      onChange={(e) =>
                        setEventForm({ ...eventForm, offer_headline_en: e.target.value })
                      }
                      placeholder="We think you might like this…"
                    />
                  </Field>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={eventForm.enabled}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, enabled: e.target.checked })
                  }
                />
                Покажи картичката
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
                  <Save className="h-4 w-4" /> Запази
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEventId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
                >
                  <X className="h-4 w-4" /> Отказ
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
              <Plus className="h-4 w-4" /> Ново събитие
            </button>
          )}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {events.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">Няма събития.</p>
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
                      {event.offer_enabled && event.offer_id && (
                        <span className="rounded-full bg-coral-500/15 px-2 py-0.5 text-[11px] font-medium text-coral-600">
                          + оферта
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{event.url}</p>
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
      )}

      {tab === "buttons" && (
        <Card title="Бутони на сайта">
          <CtaPlacementsPanel placements={ctaPlacements} offers={products} />
        </Card>
      )}

      {error && <p className="text-sm text-coral-600">{error}</p>}
    </div>
  );
}
