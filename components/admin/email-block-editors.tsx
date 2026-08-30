"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Mail, Plus, Trash2, User } from "lucide-react";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { productSellableInLocale } from "@/lib/site/product-locale";
import { guideSellableInLocale } from "@/lib/site/guide-catalog";
import type { EmailProductLinkMode } from "@/lib/email/products-block";
import { Input, Textarea } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import {
  StripeHrefPicker,
  useStripeCatalog,
} from "@/components/admin/stripe-locale-picker";
import { isStripeProductId } from "@/lib/stripe/parse-stripe-id";
import type { StripeCatalogItem } from "@/lib/admin/stripe-product-types";
import { insertAtCursor } from "@/lib/email/body-buttons";
import {
  isSafeEmailHref,
  type EmailBlock,
  type EmailBlockAlign,
} from "@/lib/email/blocks";
import { cn } from "@/lib/utils";

type Block<T extends EmailBlock["type"]> = Extract<EmailBlock, { type: T }>;

function canSellProduct(product: SiteProduct, locale: "bg" | "en"): boolean {
  return productSellableInLocale(product, locale);
}

export type BlockEditorContext = {
  locale: "bg" | "en";
  products: SiteProduct[];
  guides: SiteGuide[];
  forms: FormTemplateRecord[];
  stripeItems?: StripeCatalogItem[];
  disabled?: boolean;
};

/* --------------------------------------------------------- shared controls */

export function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-ink/15 bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
            value === option.value
              ? "bg-forest-600 text-cream"
              : "text-ink-soft hover:bg-cream",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AlignPicker({
  value,
  onChange,
  disabled,
}: {
  value: EmailBlockAlign;
  onChange: (next: EmailBlockAlign) => void;
  disabled?: boolean;
}) {
  return (
    <Segmented
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={[
        { value: "left", label: "Ляво" },
        { value: "center", label: "Център" },
        { value: "right", label: "Дясно" },
      ]}
    />
  );
}

function LinkInput({
  value,
  onChange,
  disabled,
  placeholder = "https://… или /bg#contact",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const invalid = Boolean(value.trim()) && !isSafeEmailHref(value);
  return (
    <>
      <Input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={invalid ? "border-coral-500" : undefined}
      />
      {invalid && (
        <p className="mt-1 text-xs text-coral-600">
          Линкът трябва да започва с https://, mailto:, tel: или /
        </p>
      )}
    </>
  );
}

/** Textarea with {{name}} / {{email}} insertion at the caret. */
function TokenTextarea({
  value,
  onChange,
  disabled,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function insert(token: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const { value: next, caret } = insertAtCursor(value, token, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <TokenButton
          disabled={disabled}
          onClick={() => insert("{{name}}")}
          icon={<User className="h-3 w-3" />}
          label="Име"
        />
        <TokenButton
          disabled={disabled}
          onClick={() => insert("{{email}}")}
          icon={<Mail className="h-3 w-3" />}
          label="Имейл"
        />
      </div>
      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="text-[14px] leading-relaxed"
      />
    </div>
  );
}

function TokenButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-ink/15 bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-cream disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------- per-type UI */

export function EmailBlockEditor({
  block,
  onChange,
  ctx,
}: {
  block: EmailBlock;
  onChange: (next: EmailBlock) => void;
  ctx: BlockEditorContext;
}) {
  const disabled = ctx.disabled;

  switch (block.type) {
    case "text":
      return (
        <div className="space-y-3">
          <TokenTextarea
            value={block.text}
            disabled={disabled}
            onChange={(text) => onChange({ ...block, text })}
            placeholder={"Здравей, {{name}}!\n\nТекстът ти тук…"}
            rows={5}
          />
          <div className="flex flex-wrap items-end gap-4">
            <Row label="Подравняване">
              <AlignPicker
                value={block.align}
                disabled={disabled}
                onChange={(align) => onChange({ ...block, align })}
              />
            </Row>
            <Row label="Размер">
              <Segmented
                value={block.size}
                disabled={disabled}
                onChange={(size) => onChange({ ...block, size })}
                options={[
                  { value: "sm", label: "Малък" },
                  { value: "md", label: "Нормален" },
                  { value: "lg", label: "Голям" },
                ]}
              />
            </Row>
          </div>
        </div>
      );

    case "heading":
      return (
        <div className="space-y-3">
          <Input
            value={block.text}
            disabled={disabled}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Заглавие на секцията"
          />
          <div className="flex flex-wrap items-end gap-4">
            <Row label="Ниво">
              <Segmented
                value={String(block.level) as "1" | "2" | "3"}
                disabled={disabled}
                onChange={(level) =>
                  onChange({ ...block, level: Number(level) as 1 | 2 | 3 })
                }
                options={[
                  { value: "1", label: "Голямо" },
                  { value: "2", label: "Средно" },
                  { value: "3", label: "Малко" },
                ]}
              />
            </Row>
            <Row label="Подравняване">
              <AlignPicker
                value={block.align}
                disabled={disabled}
                onChange={(align) => onChange({ ...block, align })}
              />
            </Row>
          </div>
        </div>
      );

    case "button":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Текст">
              <Input
                value={block.label}
                disabled={disabled}
                onChange={(e) => onChange({ ...block, label: e.target.value })}
                placeholder="Запиши се"
              />
            </Row>
            <Row label="Линк">
              <div className="space-y-3">
                <StripeHrefPicker
                  href={block.href}
                  onHrefChange={(href) => onChange({ ...block, href })}
                  disabled={disabled}
                />
                <LinkInput
                  value={block.href}
                  disabled={disabled}
                  onChange={(href) => onChange({ ...block, href })}
                />
              </div>
            </Row>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Row label="Цвят">
              <Segmented
                value={block.variant}
                disabled={disabled}
                onChange={(variant) => onChange({ ...block, variant })}
                options={[
                  { value: "gold", label: "Златен" },
                  { value: "green", label: "Зелен" },
                  { value: "outline", label: "Контур" },
                ]}
              />
            </Row>
            <Row label="Подравняване">
              <AlignPicker
                value={block.align}
                disabled={disabled}
                onChange={(align) => onChange({ ...block, align })}
              />
            </Row>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImageUploadField
            label="Снимка"
            hint="Качи от компютъра или пусни файла тук."
            value={block.src}
            folder="email"
            previewFit="contain"
            onChange={(src) => onChange({ ...block, src })}
            className={disabled ? "pointer-events-none opacity-60" : undefined}
          />
          <Row label="Или адрес на снимка">
            <Input
              value={block.src}
              disabled={disabled}
              onChange={(e) => onChange({ ...block, src: e.target.value })}
              placeholder="https://…"
            />
          </Row>
          <div className="grid gap-3 sm:grid-cols-2">
            <Row label="Линк при клик (по избор)">
              <LinkInput
                value={block.href}
                disabled={disabled}
                onChange={(href) => onChange({ ...block, href })}
              />
            </Row>
            <Row label="Подпис под снимката (по избор)">
              <Input
                value={block.caption}
                disabled={disabled}
                onChange={(e) => onChange({ ...block, caption: e.target.value })}
                placeholder="Кратко описание"
              />
            </Row>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Row label={`Ширина — ${block.width}%`}>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={block.width}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ ...block, width: Number(e.target.value) })
                }
                className="h-9 w-44 accent-forest-600"
              />
            </Row>
            <Row label="Подравняване">
              <AlignPicker
                value={block.align}
                disabled={disabled}
                onChange={(align) => onChange({ ...block, align })}
              />
            </Row>
            <Row label="Ъгли">
              <Segmented
                value={block.radius ? "round" : "sharp"}
                disabled={disabled}
                onChange={(v) => onChange({ ...block, radius: v === "round" })}
                options={[
                  { value: "round", label: "Заоблени" },
                  { value: "sharp", label: "Прави" },
                ]}
              />
            </Row>
          </div>
          <Row label="Алтернативен текст">
            <Input
              value={block.alt}
              disabled={disabled}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              placeholder="Какво се вижда на снимката"
            />
          </Row>
        </div>
      );

    case "columns":
      return <ColumnsEditor block={block} onChange={onChange} ctx={ctx} />;

    case "quote":
      return (
        <TokenTextarea
          value={block.text}
          disabled={disabled}
          rows={3}
          onChange={(text) => onChange({ ...block, text })}
          placeholder="Изречението, което искаш да изпъкне."
        />
      );

    case "list":
      return <ListEditor block={block} onChange={onChange} ctx={ctx} />;

    case "divider":
      return (
        <p className="text-xs text-ink-soft">
          Тънка линия през цялата ширина — за разделяне на секции.
        </p>
      );

    case "spacer":
      return (
        <Row label={`Височина — ${block.size} px`}>
          <input
            type="range"
            min={8}
            max={96}
            step={4}
            value={block.size}
            disabled={disabled}
            onChange={(e) => onChange({ ...block, size: Number(e.target.value) })}
            className="h-9 w-full max-w-xs accent-forest-600"
          />
        </Row>
      );

    case "product":
    case "guide":
      return (
        <CatalogOfferPicker
          block={block}
          onChange={onChange}
          ctx={ctx}
          disabled={disabled}
        />
      );

    case "form":
      return (
        <Row label="Форма — всеки получател получава личен линк">
          {ctx.forms.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Няма форми — създай ги в Admin → Форми.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {[...ctx.forms]
                .sort((a, b) => a.name.localeCompare(b.name, "bg"))
                .map((form) => (
                  <PickerCard
                    key={form.id}
                    selected={
                      block.formId.toLowerCase() === form.id.toLowerCase()
                    }
                    disabled={disabled}
                    onClick={() => onChange({ ...block, formId: form.id })}
                    emoji="📋"
                    title={
                      (ctx.locale === "en" ? form.title_en : form.title_bg) ||
                      form.name
                    }
                    note={form.enabled ? `/${form.slug}` : "скрита — само с покана"}
                  />
                ))}
            </div>
          )}
        </Row>
      );

    case "html":
      return (
        <div className="space-y-2">
          <Textarea
            rows={6}
            value={block.html}
            disabled={disabled}
            onChange={(e) => onChange({ ...block, html: e.target.value })}
            className="font-mono text-xs"
            placeholder="<p>Собствен HTML…</p>"
          />
          <p className="text-xs text-ink-soft">
            За напреднали — вмъква се както е написан. Ползвай таблици, не
            flex/grid, за да изглежда еднакво във всички пощи.
          </p>
        </div>
      );

    default:
      return null;
  }
}

function CatalogOfferPicker({
  block,
  onChange,
  ctx,
  disabled,
}: {
  block: Block<"product"> | Block<"guide">;
  onChange: (next: EmailBlock) => void;
  ctx: BlockEditorContext;
  disabled?: boolean;
}) {
  const selectedId =
    block.type === "product" ? block.productId : block.guideId;
  const stripeSelected = isStripeProductId(selectedId);
  const [source, setSource] = useState<"site" | "stripe">(
    stripeSelected ? "stripe" : "site",
  );
  const [query, setQuery] = useState("");
  const stripeCatalog = useStripeCatalog(source === "stripe" || stripeSelected);
  const linkMode = block.linkMode;
  const products = [...ctx.products].sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.title_bg.localeCompare(b.title_bg, "bg"),
  );
  const guides = [...(ctx.guides ?? [])].sort(
    (a, b) =>
      a.sort_order - b.sort_order || a.title_bg.localeCompare(b.title_bg, "bg"),
  );

  const stripeItems = useMemo(() => {
    const active = stripeCatalog.items.filter((item) => item.active);
    const selected = stripeSelected
      ? stripeCatalog.items.find((item) => item.stripeProductId === selectedId)
      : null;
    const list =
      selected && !selected.active ? [selected, ...active] : active;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.priceLabel && item.priceLabel.toLowerCase().includes(q)),
    );
  }, [stripeCatalog.items, query, selectedId, stripeSelected]);

  function setLinkMode(next: EmailProductLinkMode) {
    onChange({ ...block, linkMode: next });
  }

  function pickSource(next: "site" | "stripe") {
    setSource(next);
    setQuery("");
    if (next === "stripe") {
      onChange({
        id: block.id,
        type: "product",
        productId: stripeSelected ? selectedId : "",
        linkMode: "stripe",
      });
      return;
    }
    if (block.type === "product" && stripeSelected) {
      onChange({
        id: block.id,
        type: "product",
        productId: "",
        linkMode: "site",
      });
    }
  }

  function pickProduct(productId: string) {
    onChange({
      id: block.id,
      type: "product",
      productId,
      linkMode,
    });
  }

  function pickStripeProduct(stripeProductId: string) {
    onChange({
      id: block.id,
      type: "product",
      productId: stripeProductId,
      linkMode: "stripe",
    });
  }

  function pickGuide(guideId: string) {
    onChange({
      id: block.id,
      type: "guide",
      guideId,
      linkMode,
    });
  }

  return (
    <div className="space-y-3">
      <Row label="Откъде е продуктът">
        <Segmented
          value={source}
          disabled={disabled}
          onChange={pickSource}
          options={[
            { value: "site", label: "Продукт от сайта" },
            { value: "stripe", label: "Продукт от Stripe" },
          ]}
        />
      </Row>

      {source === "site" ? (
        <Row label="Продукт или наръчник — картата се попълва с актуалната цена при изпращане">
          {products.length === 0 && guides.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Няма продукти или ръководства — създай ги в Admin → Website.
            </p>
          ) : (
            <div className="space-y-3">
              {products.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-ink-soft">
                    Продукти
                  </p>
                  <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                    {products.map((product) => {
                      const sellable = canSellProduct(product, ctx.locale);
                      return (
                        <PickerCard
                          key={product.id}
                          selected={
                            block.type === "product" &&
                            selectedId.toLowerCase() === product.id.toLowerCase()
                          }
                          disabled={disabled || !sellable}
                          onClick={() => pickProduct(product.id)}
                          thumbnail={product.image_url ?? ""}
                          title={
                            (ctx.locale === "en"
                              ? product.title_en
                              : product.title_bg) || product.title_bg
                          }
                          note={
                            sellable
                              ? ctx.locale === "en"
                                ? product.price_label_en
                                : product.price_label_bg
                              : "няма Stripe цена — добави я в Website → Продукти"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {guides.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-ink-soft">
                    Ръководства
                  </p>
                  <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                    {guides.map((guide) => {
                      const sellable = guideSellableInLocale(guide, ctx.locale);
                      return (
                        <PickerCard
                          key={guide.id}
                          selected={
                            block.type === "guide" &&
                            selectedId.toLowerCase() === guide.id.toLowerCase()
                          }
                          disabled={disabled || !sellable}
                          onClick={() => pickGuide(guide.id)}
                          thumbnail={guide.image_url ?? ""}
                          emoji="📘"
                          title={
                            (ctx.locale === "en"
                              ? guide.title_en
                              : guide.title_bg) || guide.title_bg
                          }
                          note={
                            sellable
                              ? ctx.locale === "en"
                                ? guide.price_label_en
                                : guide.price_label_bg
                              : "няма Stripe цена — добави я в Website → Ръководства"
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </Row>
      ) : (
        <Row label="Продукт от Stripe — име, цена и снимка идват от Stripe">
          {stripeCatalog.pending && stripeCatalog.items.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Зареждане от Stripe…
            </p>
          ) : stripeCatalog.error && stripeCatalog.items.length === 0 ? (
            <p className="text-sm text-coral-600">{stripeCatalog.error}</p>
          ) : stripeCatalog.items.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Няма продукти в Stripe — създай ги в Stripe Dashboard.
            </p>
          ) : (
            <div className="space-y-2">
              <Input
                value={query}
                disabled={disabled}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Търси по име…"
              />
              {stripeItems.length === 0 ? (
                <p className="text-sm text-ink-soft">Няма съвпадение.</p>
              ) : (
                <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                  {stripeItems.map((item) => (
                    <PickerCard
                      key={item.stripeProductId}
                      selected={
                        block.type === "product" &&
                        selectedId === item.stripeProductId
                      }
                      disabled={disabled || !item.active}
                      onClick={() => pickStripeProduct(item.stripeProductId)}
                      thumbnail={item.imageUrl ?? ""}
                      title={item.name}
                      note={
                        [
                          item.priceLabel,
                          !item.active ? "архивиран" : "",
                          item.linkedProductTitle
                            ? `в сайта: ${item.linkedProductTitle}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </Row>
      )}

      {source === "site" && (
        <>
          <Row label="Накъде води бутонът">
            <Segmented
              value={linkMode}
              disabled={disabled}
              onChange={setLinkMode}
              options={[
                { value: "site", label: "Към сайта (с оферта)" },
                { value: "stripe", label: "Право към Stripe" },
              ]}
            />
          </Row>
          <p className="text-xs leading-relaxed text-ink-soft">
            {linkMode === "site" ? (
              <>
                Отваря страницата на продукта или наръчника в сайта. За продукти
                там се показва допълнителната оферта (upsell) и покупката се
                записва към абоната.
              </>
            ) : (
              <>
                Води директно към Stripe Payment Link. <strong>Офертата не
                се показва</strong> и покупката може да не се свърже с абоната.
              </>
            )}
          </p>
        </>
      )}
      {source === "stripe" && (
        <p className="text-xs leading-relaxed text-ink-soft">
          Картата в имейла ползва снимката, името и цената от Stripe. Бутонът
          отваря директно плащане.
        </p>
      )}
    </div>
  );
}

function PickerCard({
  selected,
  disabled,
  onClick,
  title,
  note,
  thumbnail,
  emoji,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  note?: string;
  thumbnail?: string;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-forest-500 bg-forest-500/5 ring-1 ring-forest-500/30"
          : "border-ink/10 bg-white hover:border-forest-500/40",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-forest-500/10 text-base">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          (emoji ?? "🖼")
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {title}
        </span>
        {note ? (
          <span className="block truncate text-xs text-ink-soft">{note}</span>
        ) : null}
      </span>
    </button>
  );
}

function ColumnsEditor({
  block,
  onChange,
  ctx,
}: {
  block: Block<"columns">;
  onChange: (next: EmailBlock) => void;
  ctx: BlockEditorContext;
}) {
  const disabled = ctx.disabled;

  function setCount(count: number) {
    const columns = [...block.columns];
    while (columns.length < count) {
      columns.push({ src: "", alt: "", text: "", href: "" });
    }
    onChange({ ...block, columns: columns.slice(0, count) });
  }

  function patch(index: number, patchValue: Partial<Block<"columns">["columns"][number]>) {
    const columns = block.columns.map((col, i) =>
      i === index ? { ...col, ...patchValue } : col,
    );
    onChange({ ...block, columns });
  }

  return (
    <div className="space-y-3">
      <Row label="Брой колони">
        <Segmented
          value={String(block.columns.length) as "2" | "3"}
          disabled={disabled}
          onChange={(v) => setCount(Number(v))}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
          ]}
        />
      </Row>
      <div className="grid gap-3 md:grid-cols-2">
        {block.columns.map((col, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-ink/10 bg-white p-3"
          >
            <p className="text-xs font-semibold text-ink">Колона {i + 1}</p>
            <ImageUploadField
              label="Снимка"
              value={col.src}
              folder="email"
              previewFit="contain"
              onChange={(src) => patch(i, { src })}
              className={disabled ? "pointer-events-none opacity-60" : undefined}
            />
            <Row label="Текст под снимката">
              <Textarea
                rows={2}
                value={col.text}
                disabled={disabled}
                onChange={(e) => patch(i, { text: e.target.value })}
                className="text-[13px]"
              />
            </Row>
            <Row label="Линк (по избор)">
              <LinkInput
                value={col.href}
                disabled={disabled}
                onChange={(href) => patch(i, { href })}
              />
            </Row>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink-soft">
        На телефон колоните се подреждат една под друга автоматично.
      </p>
    </div>
  );
}

function ListEditor({
  block,
  onChange,
  ctx,
}: {
  block: Block<"list">;
  onChange: (next: EmailBlock) => void;
  ctx: BlockEditorContext;
}) {
  const disabled = ctx.disabled;

  function setItem(index: number, text: string) {
    onChange({
      ...block,
      items: block.items.map((item, i) => (i === index ? text : item)),
    });
  }

  return (
    <div className="space-y-3">
      <Row label="Вид">
        <Segmented
          value={block.ordered ? "ordered" : "bullet"}
          disabled={disabled}
          onChange={(v) => onChange({ ...block, ordered: v === "ordered" })}
          options={[
            { value: "bullet", label: "Точки" },
            { value: "ordered", label: "Номера" },
          ]}
        />
      </Row>
      <div className="space-y-2">
        {block.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-xs text-ink-soft">
              {block.ordered ? `${i + 1}.` : "•"}
            </span>
            <Input
              value={item}
              disabled={disabled}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder="Точка от списъка"
            />
            <button
              type="button"
              disabled={disabled || block.items.length === 1}
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((_, index) => index !== i),
                })
              }
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink/10 text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
              aria-label="Премахни точката"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...block, items: [...block.items, ""] })}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 text-xs font-semibold text-ink hover:bg-cream disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Нова точка
      </button>
    </div>
  );
}
