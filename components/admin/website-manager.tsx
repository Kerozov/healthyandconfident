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
  Play,
} from "lucide-react";
import type { SiteCtaPlacement, SiteEvent, SiteProduct, SiteSection, SiteVideo } from "@/lib/supabase/types";
import { DEFAULT_SITE_SECTIONS } from "@/lib/site/defaults";
import { DEFAULT_OFFER_HEADLINE } from "@/lib/site/cta-placements";
import { CtaPlacementsPanel, WebsiteTabs } from "@/components/admin/website-cta-panel";
import {
  saveSiteSection,
  saveSiteEvent,
  deleteSiteEvent,
  saveSiteVideo,
  deleteSiteVideo,
  saveSiteProduct,
  deleteSiteProduct,
} from "@/app/(admin)/admin/actions";
import { ProductAdminGrid } from "@/components/admin/product-admin-grid";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
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

const EMPTY_VIDEO = {
  title_bg: "",
  title_en: "",
  youtube_url: "",
  enabled: true,
  sort_order: 0,
};

const EMPTY_PRODUCT = {
  title_bg: "",
  title_en: "",
  description_bg: "",
  description_en: "",
  stripe_url: "",
  stripe_price_id: "",
  price_label_bg: "",
  price_label_en: "",
  image_url: "",
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
  videos,
  ctaPlacements,
  dbReady = true,
  dbError,
}: {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  videos: SiteVideo[];
  ctaPlacements: SiteCtaPlacement[];
  dbReady?: boolean;
  dbError?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("products");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | "new" | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | "new" | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | "new" | null>(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);

  const eventsSection = sections.events ?? DEFAULT_SITE_SECTIONS.events;
  const productsSection = sections.products ?? DEFAULT_SITE_SECTIONS.products;
  const videosSection = sections.videos ?? DEFAULT_SITE_SECTIONS.videos;

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

  function openNewVideo() {
    setEditingVideoId("new");
    setVideoForm({ ...EMPTY_VIDEO, sort_order: (videos.length + 1) * 10 });
    setError(null);
  }

  function openEditVideo(video: SiteVideo) {
    setEditingVideoId(video.id);
    setVideoForm({
      title_bg: video.title_bg,
      title_en: video.title_en,
      youtube_url: video.youtube_url,
      enabled: video.enabled,
      sort_order: video.sort_order,
    });
    setError(null);
  }

  function saveVideo() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteVideo({
        id: editingVideoId === "new" ? undefined : editingVideoId!,
        ...videoForm,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingVideoId(null);
      refresh();
    });
  }

  function removeVideo(id: string, title: string) {
    if (!confirm(`Изтрий видео „${title || "без заглавие"}"?`)) return;
    startTransition(async () => {
      await deleteSiteVideo(id);
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
      stripe_price_id: product.stripe_price_id ?? "",
      price_label_bg: product.price_label_bg,
      price_label_en: product.price_label_en,
      image_url: product.image_url ?? "",
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
    if (!confirm(`Изтрий продукт „${title}"?`)) return;
    startTransition(async () => {
      await deleteSiteProduct(id);
      refresh();
    });
  }

  return (
    <div className="space-y-6">
      {!dbReady && (
        <div className="rounded-2xl border border-coral-400/40 bg-coral-500/10 px-5 py-4 text-sm text-ink">
          <p className="font-semibold text-coral-700">Първо пусни миграцията в Supabase</p>
          <p className="mt-1 text-ink-soft">
            Изпълни{" "}
            <code className="text-xs">supabase/migrations/RUN_PENDING_MIGRATIONS.sql</code>{" "}
            или целия{" "}
            <code className="text-xs">SETUP_DATABASE.sql</code> в Supabase SQL Editor.
          </p>
          {dbError && <p className="mt-2 font-mono text-xs text-coral-600">{dbError}</p>}
        </div>
      )}

      <WebsiteTabs tab={tab} onChange={setTab} />

      {tab === "products" && (
        <Card
          title="Продукти в магазина"
          action={
            editingProductId !== "new" ? (
              <button
                type="button"
                onClick={openNewProduct}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Нов продукт
              </button>
            ) : null
          }
        >
          <p className="mb-4 text-sm text-ink-soft">
            Продукти със Stripe линк, показвани в отделна секция „Магазин“ на сайта. В таб{" "}
            <strong>Popup upsell</strong> избираш кой продукт да излиза като popup при клик.
          </p>
          <SectionToggle section={productsSection} onSaved={refresh} />

          {editingProductId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                <Field label="Име — EN" hint="По избор — ако е празно, копира се от BG">
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
                <Field
                  label="Stripe Price ID"
                  hint="price_… от Stripe Dashboard — за комбинирано плащане (продукт + upsell)"
                >
                  <Input
                    value={productForm.stripe_price_id}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stripe_price_id: e.target.value })
                    }
                    placeholder="price_1ABC..."
                  />
                </Field>
                <ImageUploadField
                  label="Снимка"
                  value={productForm.image_url}
                  onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                  folder="products"
                />
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
                  hint={`Празно = ${DEFAULT_OFFER_HEADLINE.bg}`}
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
                Активен продукт
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveProduct}
                  disabled={
                    pending || !productForm.title_bg.trim() || !productForm.stripe_url.trim()
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
              {error && <p className="text-sm text-coral-600">{error}</p>}
            </div>
          ) : null}

          <div className="mt-4">
            <ProductAdminGrid
              products={products}
              onEdit={openEditProduct}
              onDelete={removeProduct}
              onReordered={refresh}
              disabled={pending || editingProductId !== null}
            />
          </div>
        </Card>
      )}

      {tab === "events" && (
        <Card
          title="Предстоящи събития"
          action={
            editingEventId !== "new" ? (
              <button
                type="button"
                onClick={openNewEvent}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Ново събитие
              </button>
            ) : null
          }
        >
          <p className="mb-4 text-sm text-ink-soft">
            Събития с линк към записване. Popup upsell не се показва при събития — само при
            бутони и продукти в магазина.
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
                <ImageUploadField
                  label="Снимка"
                  value={eventForm.image_url}
                  onChange={(url) => setEventForm({ ...eventForm, image_url: url })}
                  folder="events"
                />
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
          ) : null}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {events.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">
                Няма събития. Натисни <strong>Ново събитие</strong> горе вдясно.
              </p>
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

      {tab === "videos" && (
        <Card
          title="YouTube видеа"
          action={
            editingVideoId !== "new" ? (
              <button
                type="button"
                onClick={openNewVideo}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Ново видео
              </button>
            ) : null
          }
        >
          <p className="mb-4 text-sm text-ink-soft">
            Вдъхновяващи истории и ревюта — постави YouTube линк (watch, youtu.be или embed).
          </p>
          <SectionToggle section={videosSection} onSaved={refresh} />

          {editingVideoId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Заглавие — BG (по избор)">
                  <Input
                    value={videoForm.title_bg}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, title_bg: e.target.value })
                    }
                    placeholder="Ревю — Юлия, програмата Живей без резистентност"
                  />
                </Field>
                <Field label="Заглавие — EN (optional)">
                  <Input
                    value={videoForm.title_en}
                    onChange={(e) =>
                      setVideoForm({ ...videoForm, title_en: e.target.value })
                    }
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="YouTube линк">
                    <Input
                      value={videoForm.youtube_url}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, youtube_url: e.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </Field>
                </div>
                <Field label="Ред">
                  <Input
                    type="number"
                    value={videoForm.sort_order}
                    onChange={(e) =>
                      setVideoForm({
                        ...videoForm,
                        sort_order: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={videoForm.enabled}
                  onChange={(e) =>
                    setVideoForm({ ...videoForm, enabled: e.target.checked })
                  }
                />
                Покажи на сайта
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveVideo}
                  disabled={pending || !videoForm.youtube_url}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> Запази
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVideoId(null)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
                >
                  <X className="h-4 w-4" /> Отказ
                </button>
              </div>
            </div>
          ) : null}

          <div className="divide-y divide-ink/5 rounded-xl border border-ink/10">
            {videos.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">
                Няма видеа. Натисни <strong>Ново видео</strong> горе вдясно.
              </p>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Play className="h-4 w-4 shrink-0 text-forest-600" />
                      <p className="font-medium">
                        {video.title_bg || video.title_en || "Без заглавие"}
                      </p>
                      {!video.enabled && (
                        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] text-ink-soft">
                          скрито
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-soft">{video.youtube_url}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEditVideo(video)}
                      disabled={pending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        removeVideo(video.id, video.title_bg || video.title_en)
                      }
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
        <Card title="Popup upsell">
          <CtaPlacementsPanel placements={ctaPlacements} offers={products} />
        </Card>
      )}

      {error && <p className="text-sm text-coral-600">{error}</p>}
    </div>
  );
}
