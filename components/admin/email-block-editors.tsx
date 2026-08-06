"use client";

import { useRef } from "react";
import { Mail, Plus, Trash2, User } from "lucide-react";
import type { SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { Input, Textarea } from "@/components/admin/fields";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { insertAtCursor } from "@/lib/email/body-buttons";
import {
  isSafeEmailHref,
  type EmailBlock,
  type EmailBlockAlign,
} from "@/lib/email/blocks";
import { cn } from "@/lib/utils";

type Block<T extends EmailBlock["type"]> = Extract<EmailBlock, { type: T }>;

export type BlockEditorContext = {
  locale: "bg" | "en";
  products: SiteProduct[];
  forms: FormTemplateRecord[];
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
              <LinkInput
                value={block.href}
                disabled={disabled}
                onChange={(href) => onChange({ ...block, href })}
              />
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
      return (
        <Row label="Продукт — картата се попълва с актуалната цена при изпращане">
          {ctx.products.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Няма продукти — създай ги в Admin → Website → Продукти.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {[...ctx.products]
                .sort(
                  (a, b) =>
                    a.sort_order - b.sort_order ||
                    a.title_bg.localeCompare(b.title_bg, "bg"),
                )
                .map((product) => (
                  <PickerCard
                    key={product.id}
                    selected={
                      block.productId.toLowerCase() ===
                      product.id.toLowerCase()
                    }
                    disabled={disabled || !product.stripe_url?.trim()}
                    onClick={() => onChange({ ...block, productId: product.id })}
                    thumbnail={product.image_url ?? ""}
                    title={
                      (ctx.locale === "en"
                        ? product.title_en
                        : product.title_bg) || product.title_bg
                    }
                    note={
                      product.stripe_url?.trim()
                        ? ctx.locale === "en"
                          ? product.price_label_en
                          : product.price_label_bg
                        : "липсва Stripe линк"
                    }
                  />
                ))}
            </div>
          )}
        </Row>
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
                    disabled={disabled || !form.enabled}
                    onClick={() => onChange({ ...block, formId: form.id })}
                    emoji="📋"
                    title={
                      (ctx.locale === "en" ? form.title_en : form.title_bg) ||
                      form.name
                    }
                    note={form.enabled ? `/${form.slug}` : "изключена"}
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
