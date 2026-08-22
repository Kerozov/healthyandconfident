"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Code,
  Columns2,
  Copy,
  GripVertical,
  Heading,
  Image as ImageIcon,
  List,
  Minus,
  MousePointerClick,
  MoveVertical,
  Package,
  BookOpen,
  Plus,
  Quote,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { SiteGuide, SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { EmailAttachmentPicker } from "@/components/admin/email-attachment-picker";
import {
  EmailBlockEditor,
  type BlockEditorContext,
} from "@/components/admin/email-block-editors";
import {
  createEmailBlock,
  duplicateEmailBlock,
  EMAIL_BLOCK_LABELS,
  emailBlockSummary,
  isEmptyEmailBlock,
  moveEmailBlock,
  parseEmailBlocks,
  serializeEmailBlocks,
  type EmailBlock,
  type EmailBlockType,
} from "@/lib/email/blocks";
import { cn } from "@/lib/utils";

const BLOCK_ICONS: Record<EmailBlockType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  heading: Heading,
  button: MousePointerClick,
  image: ImageIcon,
  columns: Columns2,
  quote: Quote,
  list: List,
  divider: Minus,
  spacer: MoveVertical,
  product: Package,
  guide: BookOpen,
  form: ClipboardList,
  html: Code,
};

const PALETTE: { title: string; types: EmailBlockType[] }[] = [
  { title: "Текст", types: ["text", "heading", "list", "quote"] },
  { title: "Медия", types: ["image", "columns"] },
  { title: "Действие", types: ["button", "product", "guide", "form"] },
  { title: "Оформление", types: ["divider", "spacer", "html"] },
];

export function EmailBuilder({
  value,
  onChange,
  locale = "bg",
  products = [],
  guides = [],
  forms = [],
  heroImageUrl,
  onHeroImageChange,
  attachmentPath,
  attachmentFilename,
  onAttachmentChange,
  disabled,
  title = "Съдържание на имейла",
}: {
  value: string;
  onChange: (html: string) => void;
  locale?: "bg" | "en";
  products?: SiteProduct[];
  guides?: SiteGuide[];
  forms?: FormTemplateRecord[];
  heroImageUrl?: string;
  onHeroImageChange?: (url: string) => void;
  attachmentPath?: string;
  attachmentFilename?: string;
  onAttachmentChange?: (path: string, filename: string) => void;
  disabled?: boolean;
  title?: string;
}) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() =>
    parseEmailBlocks(value),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [paletteAt, setPaletteAt] = useState<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const emitted = useRef(value);

  // The body is owned by the parent form, so re-parse only when it changes
  // from the outside (loading another automation, resetting after a send).
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setBlocks(parseEmailBlocks(value));
  }, [value]);

  function commit(next: EmailBlock[]) {
    setBlocks(next);
    const html = serializeEmailBlocks(next);
    emitted.current = html;
    onChange(html);
  }

  function addBlock(type: EmailBlockType, at: number) {
    const block = createEmailBlock(type);
    const next = [...blocks];
    next.splice(Math.min(Math.max(at, 0), next.length), 0, block);
    commit(next);
    setPaletteAt(null);
    const needsInput = !["divider", "spacer"].includes(type);
    setOpenId(needsInput ? block.id : null);
  }

  function patchBlock(index: number, next: EmailBlock) {
    commit(blocks.map((block, i) => (i === index ? next : block)));
  }

  function removeBlock(index: number) {
    commit(blocks.filter((_, i) => i !== index));
  }

  function copyBlock(index: number) {
    const next = [...blocks];
    next.splice(index + 1, 0, duplicateEmailBlock(blocks[index]));
    commit(next);
  }

  function cancelDrag() {
    setDragId(null);
    setDropIndex(null);
  }

  function commitDrop() {
    if (dragId !== null && dropIndex !== null) {
      const from = blocks.findIndex((block) => block.id === dragId);
      if (from >= 0) {
        const to = dropIndex > from ? dropIndex - 1 : dropIndex;
        if (to !== from) commit(moveEmailBlock(blocks, from, to));
      }
    }
    cancelDrag();
  }

  const ctx: BlockEditorContext = { locale, products, guides, forms, disabled };
  const emptyCount = blocks.filter(isEmptyEmailBlock).length;

  return (
    <div className="space-y-4">
      {onHeroImageChange && (
        <div className="rounded-2xl border border-ink/10 bg-white p-3 sm:p-4">
          <ImageUploadField
            label="Банер най-отгоре (по избор)"
            hint="Стои над логото, преди съдържанието. За снимка между текста добави блок „Снимка“ — него можеш да местиш свободно."
            value={heroImageUrl ?? ""}
            onChange={onHeroImageChange}
            folder="email"
            previewFit="contain"
            className={disabled ? "pointer-events-none opacity-60" : undefined}
          />
        </div>
      )}

      <div className="rounded-2xl border border-ink/10 bg-cream/40 p-2 sm:p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink-soft">
            {blocks.length === 0
              ? "Още няма блокове"
              : `${blocks.length} ${blocks.length === 1 ? "блок" : "блока"}`}
            {emptyCount > 0 && ` · ${emptyCount} празни се пропускат`}
          </p>
        </div>

        <div
          onDragOver={(event) => {
            if (!dragId) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            commitDrop();
          }}
          className="space-y-0"
        >
          {blocks.length === 0 && paletteAt === null && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPaletteAt(0)}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-ink/20 bg-white/60 px-4 py-8 text-center hover:border-forest-500/50 hover:bg-white disabled:opacity-60"
            >
              <Plus className="h-5 w-5 text-forest-600" />
              <span className="text-sm font-semibold text-ink">
                Добави първия блок
              </span>
              <span className="text-xs text-ink-soft">
                Текст, снимка, бутон, продукт, наръчник или форма — в какъвто ред искаш.
              </span>
            </button>
          )}

          {blocks.map((block, index) => (
            <div key={block.id}>
              <DropLine active={dragId !== null && dropIndex === index} />
              {paletteAt === index && (
                <Palette
                  products={products}
                  guides={guides}
                  forms={forms}
                  onPick={(type) => addBlock(type, index)}
                  onClose={() => setPaletteAt(null)}
                />
              )}
              <InsertHandle
                disabled={disabled}
                hidden={paletteAt !== null || dragId !== null}
                onClick={() => setPaletteAt(index)}
              />
              <BlockCard
                block={block}
                index={index}
                total={blocks.length}
                open={openId === block.id}
                dragging={dragId === block.id}
                disabled={disabled}
                ctx={ctx}
                onDragStart={() => {
                  setDragId(block.id);
                  setOpenId(null);
                }}
                onDragEnd={cancelDrag}
                onDragOverCard={(after) =>
                  setDropIndex(index + (after ? 1 : 0))
                }
                onToggle={() =>
                  setOpenId(openId === block.id ? null : block.id)
                }
                onChange={(next) => patchBlock(index, next)}
                onMove={(direction) =>
                  commit(moveEmailBlock(blocks, index, index + direction))
                }
                onCopy={() => copyBlock(index)}
                onRemove={() => removeBlock(index)}
              />
            </div>
          ))}

          <DropLine
            active={dragId !== null && dropIndex === blocks.length}
          />
        </div>

        {paletteAt === blocks.length ? (
          <Palette
            products={products}
            guides={guides}
            forms={forms}
            onPick={(type) => addBlock(type, blocks.length)}
            onClose={() => setPaletteAt(null)}
          />
        ) : paletteAt === null && blocks.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setPaletteAt(blocks.length)}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-white/70 text-sm font-semibold text-ink hover:border-forest-500/50 hover:bg-white disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Добави блок
          </button>
        ) : null}
      </div>

      {onAttachmentChange && (
        <div className="rounded-2xl border border-ink/10 bg-white p-3 sm:p-4">
          <EmailAttachmentPicker
            path={attachmentPath ?? ""}
            filename={attachmentFilename ?? ""}
            onChange={onAttachmentChange}
          />
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- one block */

function BlockCard({
  block,
  index,
  total,
  open,
  dragging,
  disabled,
  ctx,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onToggle,
  onChange,
  onMove,
  onCopy,
  onRemove,
}: {
  block: EmailBlock;
  index: number;
  total: number;
  open: boolean;
  dragging: boolean;
  disabled?: boolean;
  ctx: BlockEditorContext;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (after: boolean) => void;
  onToggle: () => void;
  onChange: (next: EmailBlock) => void;
  onMove: (direction: -1 | 1) => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  const Icon = BLOCK_ICONS[block.type];
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      onDragOver={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onDragOverCard(event.clientY > rect.top + rect.height / 2);
      }}
      className={cn(
        "rounded-xl border bg-white transition-shadow",
        open ? "border-forest-500/50 shadow-sm" : "border-ink/10",
        dragging && "opacity-40",
        isEmptyEmailBlock(block) && !open && "border-dashed",
      )}
    >
      {/* Only the header row is draggable — the open editor below keeps normal
          text selection inside its inputs. */}
      <div
        draggable={!disabled}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          // Firefox refuses to start a drag without payload on the transfer.
          event.dataTransfer.setData("text/plain", block.id);
          if (cardRef.current) {
            event.dataTransfer.setDragImage(cardRef.current, 24, 20);
          }
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="flex items-center gap-1.5 px-1.5 py-1.5 sm:gap-2 sm:px-2"
      >
        <span
          title="Влачи, за да преместиш"
          className={cn(
            "inline-flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-ink-soft/60 active:cursor-grabbing",
            disabled && "opacity-40",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${EMAIL_BLOCK_LABELS[block.type]} — ${open ? "затвори" : "редактирай"}`}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1 py-1.5 text-left hover:bg-cream/60"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-500/10 text-forest-700">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {EMAIL_BLOCK_LABELS[block.type]}
            </span>
            <BlockGlance block={block} ctx={ctx} />
          </span>
        </button>

        <div className="flex shrink-0 items-center">
          <IconAction
            label="Нагоре"
            disabled={disabled || index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUp className="h-4 w-4" />
          </IconAction>
          <IconAction
            label="Надолу"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </IconAction>
          <IconAction label="Дублирай" disabled={disabled} onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </IconAction>
          <IconAction
            label="Изтрий"
            disabled={disabled}
            onClick={onRemove}
            danger
          >
            <Trash2 className="h-4 w-4" />
          </IconAction>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink/10 px-3 py-3 sm:px-4">
          <EmailBlockEditor block={block} onChange={onChange} ctx={ctx} />
        </div>
      )}
    </div>
  );
}

/** Compact, roughly-what-it-looks-like row shown on a collapsed block. */
function BlockGlance({
  block,
  ctx,
}: {
  block: EmailBlock;
  ctx: BlockEditorContext;
}) {
  if (block.type === "image" && block.src.trim()) {
    return (
      <span className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.src}
          alt=""
          className="h-8 w-12 shrink-0 rounded object-cover"
        />
        <span className="truncate text-sm text-ink">
          {emailBlockSummary(block)}
        </span>
      </span>
    );
  }

  if (block.type === "columns") {
    return (
      <span className="flex items-center gap-1.5">
        {block.columns.map((col, i) =>
          col.src.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={col.src}
              alt=""
              className="h-8 w-10 shrink-0 rounded object-cover"
            />
          ) : (
            <span
              key={i}
              className="h-8 w-10 shrink-0 rounded border border-dashed border-ink/20"
            />
          ),
        )}
        <span className="truncate text-sm text-ink-soft">
          {block.columns.map((c) => c.text.trim()).filter(Boolean).join(" · ")}
        </span>
      </span>
    );
  }

  if (block.type === "button") {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            block.variant === "green" && "bg-[#2D7A47] text-white",
            block.variant === "gold" && "bg-[#F0B429] text-[#1A2E1A]",
            block.variant === "outline" &&
              "border-2 border-[#1A2E1A] text-[#1A2E1A]",
          )}
        >
          {block.label.trim() || "Без текст"}
        </span>
        <span className="truncate text-xs text-ink-soft">
          {block.href.trim() || "без линк"}
        </span>
      </span>
    );
  }

  if (block.type === "divider") {
    return <span className="mt-1.5 block h-px w-full bg-ink/15" />;
  }

  if (block.type === "spacer") {
    return (
      <span
        className="mt-1 block w-full rounded border border-dashed border-ink/20"
        style={{ height: Math.min(block.size, 28) }}
      />
    );
  }

  if (block.type === "product") {
    const product = ctx.products.find(
      (p) => p.id.toLowerCase() === block.productId.toLowerCase(),
    );
    return (
      <span className="truncate text-sm text-ink">
        {product
          ? (ctx.locale === "en" ? product.title_en : product.title_bg) ||
            product.title_bg
          : "Не е избран продукт"}
      </span>
    );
  }

  if (block.type === "guide") {
    const guide = ctx.guides.find(
      (g) => g.id.toLowerCase() === block.guideId.toLowerCase(),
    );
    return (
      <span className="truncate text-sm text-ink">
        {guide
          ? (ctx.locale === "en" ? guide.title_en : guide.title_bg) ||
            guide.title_bg
          : "Не е избран наръчник"}
      </span>
    );
  }

  if (block.type === "form") {
    const form = ctx.forms.find(
      (f) => f.id.toLowerCase() === block.formId.toLowerCase(),
    );
    return (
      <span className="truncate text-sm text-ink">
        {form
          ? (ctx.locale === "en" ? form.title_en : form.title_bg) || form.name
          : "Не е избрана форма"}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "block truncate text-sm",
        isEmptyEmailBlock(block) ? "text-ink-soft/70" : "text-ink",
        block.type === "heading" && "font-display font-semibold",
        block.type === "quote" && "italic",
      )}
    >
      {emailBlockSummary(block)}
    </span>
  );
}

function IconAction({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-cream disabled:opacity-30",
        danger && "hover:bg-coral-500/10 hover:text-coral-600",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- insert bits */

function DropLine({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        "h-0.5 rounded-full transition-colors",
        active ? "my-1 bg-forest-600" : "bg-transparent",
      )}
    />
  );
}

function InsertHandle({
  onClick,
  disabled,
  hidden,
}: {
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
}) {
  if (hidden) return <div className="h-1.5" />;
  return (
    <div className="group flex h-4 items-center justify-center">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title="Вмъкни блок тук"
        className="inline-flex h-4 items-center gap-1 rounded-full px-2 text-[10px] font-bold text-forest-700 opacity-0 transition-opacity hover:bg-forest-500/10 focus:opacity-100 group-hover:opacity-100 disabled:hidden"
      >
        <Plus className="h-3 w-3" />
        тук
      </button>
    </div>
  );
}

function Palette({
  onPick,
  onClose,
  products,
  guides,
  forms,
}: {
  onPick: (type: EmailBlockType) => void;
  onClose: () => void;
  products: SiteProduct[];
  guides: SiteGuide[];
  forms: FormTemplateRecord[];
}) {
  return (
    <div className="my-2 rounded-xl border border-forest-500/30 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Избери блок
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-cream"
          aria-label="Затвори"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {PALETTE.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 text-[11px] font-semibold text-ink-soft">
              {group.title}
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {group.types.map((type) => {
                const Icon = BLOCK_ICONS[type];
                const empty =
                  (type === "product" && products.length === 0) ||
                  (type === "guide" && guides.length === 0) ||
                  (type === "form" && forms.length === 0);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={empty}
                    onClick={() => onPick(type)}
                    title={
                      empty ? "Няма налични записи" : EMAIL_BLOCK_LABELS[type]
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-cream/40 px-2.5 py-2 text-xs font-semibold text-ink hover:border-forest-500/40 hover:bg-forest-500/5 disabled:opacity-40"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-forest-700" />
                    <span className="truncate">{EMAIL_BLOCK_LABELS[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
