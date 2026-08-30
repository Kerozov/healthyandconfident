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
import type {
  Segment,
  SegmentGroup,
  SiteCtaPlacement,
  SiteEvent,
  SiteProduct,
  SiteGuide,
  SiteSection,
  SiteVideo,
} from "@/lib/supabase/types";
import { SegmentAssignChecklist } from "@/components/admin/segment-checklist";
import { DEFAULT_SITE_SECTIONS } from "@/lib/site/defaults";
import { DEFAULT_OFFER_HEADLINE } from "@/lib/site/cta-placements";
import { productPlacementKey, productCheckoutPath } from "@/lib/site/product-placement";
import { PublicPathLinks } from "@/components/admin/public-path-links";
import { formatStripeIdInput, isValidStripeIdInput } from "@/lib/stripe/parse-stripe-id";
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
import { GuidesManagerPanel } from "@/components/admin/guides-manager";
import { ProductAdminGrid } from "@/components/admin/product-admin-grid";
import { ProductOfferEditor } from "@/components/admin/product-offer-editor";
import { StripeCatalogPanel } from "@/components/admin/stripe-catalog-panel";
import {
  StripeLocalePicker,
  invalidateStripeCatalogCache,
} from "@/components/admin/stripe-locale-picker";
import { Field, Input, Textarea, Card, LocaleVisibilityCheckboxes } from "@/components/admin/fields";
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
  enabled_en: true,
  sort_order: 0,
};

const EMPTY_PRODUCT = {
  title_bg: "",
  title_en: "",
  description_bg: "",
  description_en: "",
  stripe_url: "",
  stripe_id: "",
  stripe_url_en: "",
  stripe_id_en: "",
  price_label_bg: "",
  price_label_en: "",
  image_url: "",
  headline_bg: "",
  headline_en: "",
  cta_label_bg: "",
  cta_label_en: "",
  upsell_offer_id: "",
  upsell_offer_enabled: false,
  upsell_offer_headline_bg: "",
  upsell_offer_headline_en: "",
  downsell_offer_id: "",
  downsell_enabled: false,
  downsell_headline_bg: "",
  downsell_headline_en: "",
  purchase_tags: [] as string[],
  enabled: true,
  enabled_en: true,
};

export function WebsiteManager({
  sections,
  events,
  products,
  guides,
  videos,
  ctaPlacements,
  segments,
  groups,
  dbReady = true,
  dbError,
}: {
  sections: Record<string, SiteSection>;
  events: SiteEvent[];
  products: SiteProduct[];
  guides: SiteGuide[];
  videos: SiteVideo[];
  ctaPlacements: SiteCtaPlacement[];
  segments: Segment[];
  groups: SegmentGroup[];
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
      enabled_en: video.enabled_en !== false,
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
    setProductForm({ ...EMPTY_PRODUCT });
    setError(null);
  }

  function openEditProduct(product: SiteProduct) {
    const placement = ctaPlacements.find((p) => p.key === productPlacementKey(product.id));
    setEditingProductId(product.id);
    setProductForm({
      title_bg: product.title_bg,
      title_en: product.title_en,
      description_bg: product.description_bg,
      description_en: product.description_en,
      stripe_url: product.stripe_url,
      stripe_id: formatStripeIdInput(product),
      stripe_url_en: product.stripe_url_en ?? "",
      stripe_id_en: formatStripeIdInput({
        stripe_product_id: product.stripe_product_id_en,
        stripe_price_id: product.stripe_price_id_en,
      }),
      price_label_bg: product.price_label_bg,
      price_label_en: product.price_label_en,
      image_url: product.image_url ?? "",
      headline_bg: product.headline_bg ?? "",
      headline_en: product.headline_en ?? "",
      cta_label_bg: product.cta_label_bg ?? "",
      cta_label_en: product.cta_label_en ?? "",
      upsell_offer_id: placement?.offer_id ?? "",
      upsell_offer_enabled: placement?.offer_enabled ?? false,
      upsell_offer_headline_bg: placement?.offer_headline_bg ?? "",
      upsell_offer_headline_en: placement?.offer_headline_en ?? "",
      downsell_offer_id: placement?.downsell_offer_id ?? "",
      downsell_enabled: placement?.downsell_enabled ?? false,
      downsell_headline_bg: placement?.downsell_headline_bg ?? "",
      downsell_headline_en: placement?.downsell_headline_en ?? "",
      purchase_tags: product.purchase_tags ?? [],
      enabled: product.enabled,
      enabled_en: product.enabled_en !== false,
    });
    setError(null);
  }

  function canSaveProduct() {
    if (!productForm.title_bg.trim()) return false;
    if (productForm.stripe_url.trim()) return true;
    return isValidStripeIdInput(productForm.stripe_id);
  }

  function saveProduct() {
    setError(null);
    startTransition(async () => {
      const res = await saveSiteProduct({
        id: editingProductId === "new" ? undefined : editingProductId!,
        ...productForm,
        sort_order:
          editingProductId === "new" ? (products.length + 1) * 10 : undefined,
        purchase_tags: productForm.purchase_tags,
        upsell_offer_id: productForm.upsell_offer_id || null,
        downsell_offer_id: productForm.downsell_offer_id || null,
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setEditingProductId(null);
      invalidateStripeCatalogCache();
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
            <code className="text-xs">supabase/scripts/RUN_PENDING_MIGRATIONS.sql</code>{" "}
            или целия{" "}
            <code className="text-xs">supabase/scripts/SETUP_DATABASE.sql</code> в Supabase SQL Editor.
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
          <div className="mb-4 space-y-2 text-sm text-ink-soft">
            <p>
              Закачи <strong>отделен Stripe продукт или Payment Link</strong> за
              български и за английски. Подреди с влачене в списъка долу — без
              ръчни номера.
            </p>
            <p>
              Ако има Stripe цена (<code>price_/prod_</code>), сайтът ползва
              Checkout (нужно за сегменти след покупка и за оферта в същата
              сметка). Payment Link е резервен вариант.
            </p>
          </div>
          <SectionToggle section={productsSection} onSaved={refresh} />

          {!editingProductId && (
            <StripeCatalogPanel
              onEditProduct={(id) => {
                const product = products.find((p) => p.id === id);
                if (product) openEditProduct(product);
              }}
              onImported={() => {
                invalidateStripeCatalogCache();
                refresh();
              }}
            />
          )}

          {editingProductId ? (
            <div className="mb-6 space-y-4 rounded-xl border border-ink/10 p-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                <ImageUploadField
                  label="Снимка"
                  value={productForm.image_url}
                  onChange={(url) => setProductForm({ ...productForm, image_url: url })}
                  folder="products"
                />
                {editingProductId !== "new" && (
                  <Field label="Публични линкове">
                    <PublicPathLinks
                      paths={[
                        {
                          label: productCheckoutPath(editingProductId, "bg"),
                          href: productCheckoutPath(editingProductId, "bg"),
                        },
                        {
                          label: productCheckoutPath(editingProductId, "en"),
                          href: productCheckoutPath(editingProductId, "en"),
                        },
                      ]}
                    />
                  </Field>
                )}
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

              <StripeLocalePicker
                label="Плащане — български"
                hint="Това се ползва на /bg и като резерва за английски, ако там няма отделен Stripe."
                value={{
                  stripe_id: productForm.stripe_id,
                  stripe_url: productForm.stripe_url,
                  price_label: productForm.price_label_bg,
                }}
                onChange={(next) =>
                  setProductForm({
                    ...productForm,
                    stripe_id: next.stripe_id,
                    stripe_url: next.stripe_url,
                    price_label_bg: next.price_label ?? productForm.price_label_bg,
                  })
                }
                disabled={pending}
              />

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={productForm.enabled_en}
                  onChange={(e) =>
                    setProductForm({ ...productForm, enabled_en: e.target.checked })
                  }
                />
                Английска версия (магазин /en и английски имейли)
              </label>

              {productForm.enabled_en && (
                <StripeLocalePicker
                  label="Плащане — английски"
                  hint="Отделен Stripe продукт или Payment Link. Ако оставиш празно, ползва се българското плащане."
                  value={{
                    stripe_id: productForm.stripe_id_en,
                    stripe_url: productForm.stripe_url_en,
                    price_label: productForm.price_label_en,
                  }}
                  onChange={(next) =>
                    setProductForm({
                      ...productForm,
                      stripe_id_en: next.stripe_id,
                      stripe_url_en: next.stripe_url,
                      price_label_en: next.price_label ?? productForm.price_label_en,
                    })
                  }
                  disabled={pending}
                />
              )}
              <ProductOfferEditor
                products={products}
                editingProductId={editingProductId}
                form={productForm}
                onChange={(patch) => setProductForm({ ...productForm, ...patch })}
                currentStripeIdBg={productForm.stripe_id}
                currentStripeIdEn={productForm.stripe_id_en}
              />
              <div className="rounded-xl border border-forest-500/20 bg-forest-50/30 p-4 space-y-3">
                <p className="text-sm font-semibold text-forest-800">Сегменти след покупка</p>
                <p className="text-xs text-ink-soft">
                  След успешно плащане абонатът влиза в избраните сегменти. В автоматизации
                  можеш да ги ползваш за включване или изключване (напр. да спреш напомняния
                  след покупка).
                </p>
                <SegmentAssignChecklist
                  segments={segments}
                  groups={groups}
                  selected={productForm.purchase_tags}
                  onChange={(purchase_tags) =>
                    setProductForm({ ...productForm, purchase_tags })
                  }
                  disabled={pending}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={productForm.enabled}
                  onChange={(e) =>
                    setProductForm({ ...productForm, enabled: e.target.checked })
                  }
                />
                Покажи на българския сайт (магазин /bg)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveProduct}
                  disabled={pending || !canSaveProduct()}
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
            <p className="mb-3 text-xs font-medium text-ink-soft">
              Хвани иконата с точките и влачи, за да смениш реда в магазина.
            </p>
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

      {tab === "guides" && (
        <GuidesManagerPanel
          guides={guides}
          section={sections.guides ?? DEFAULT_SITE_SECTIONS.guides}
          segments={segments}
          groups={groups}
        />
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
            Събития с линк към записване. Ако включиш допълнителна оферта, тя се показва
            като карта под събитието (не като popup — записването води към външен линк).
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
            Вдъхновяващи истории и ревюта — YouTube линк и избор дали да се показва на
            българския сайт, на английския, или и на двете.
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

              <LocaleVisibilityCheckboxes
                enabled={videoForm.enabled}
                enabledEn={videoForm.enabled_en}
                onEnabledChange={(enabled) => setVideoForm({ ...videoForm, enabled })}
                onEnabledEnChange={(enabled_en) =>
                  setVideoForm({ ...videoForm, enabled_en })
                }
                disabled={pending}
              />
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
                      {video.enabled && video.enabled_en !== false ? (
                        <span className="rounded-full bg-forest-600/10 px-2 py-0.5 text-[11px] font-semibold text-forest-700">
                          BG + EN
                        </span>
                      ) : video.enabled ? (
                        <span className="rounded-full bg-forest-600/10 px-2 py-0.5 text-[11px] font-semibold text-forest-700">
                          само BG
                        </span>
                      ) : video.enabled_en !== false ? (
                        <span className="rounded-full bg-sky-600/10 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                          само EN
                        </span>
                      ) : (
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
        <Card title="Бутони на сайта">
          <CtaPlacementsPanel placements={ctaPlacements} offers={products} />
        </Card>
      )}

      {error && <p className="text-sm text-coral-600">{error}</p>}
    </div>
  );
}
