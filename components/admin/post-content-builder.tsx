"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Loader2,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { Field, Input, Textarea } from "@/components/admin/fields";
import {
  ImageUploadField,
  uploadSiteImage,
} from "@/components/admin/image-upload-field";
import { MarkdownLinkToolbar } from "@/components/admin/markdown-link-toolbar";
import { IMAGE_LAYOUTS, type ImageLayout } from "@/lib/site/markdown-images";
import {
  createPostBlock,
  emptyPostImage,
  isEmptyPostBlock,
  movePostBlock,
  parsePostBlocks,
  POST_BLOCK_LABELS,
  serializePostBlocks,
  type PostBlock,
  type PostBlockType,
  type PostImage,
} from "@/lib/site/post-blocks";
import { cn } from "@/lib/utils";

type TextBlock = Extract<PostBlock, { type: "text" }>;
type ImageBlock = Extract<PostBlock, { type: "image" }>;
type GalleryBlock = Extract<PostBlock, { type: "gallery" }>;

const BLOCK_ICONS: Record<PostBlockType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  image: ImageIcon,
  gallery: Images,
};

const BLOCK_TYPES: PostBlockType[] = ["text", "image", "gallery"];

const LAYOUT_LABELS: Record<ImageLayout, string> = {
  full: "Цяла ширина",
  center: "По-малка, в средата",
  left: "Вляво, текст до нея",
  right: "Вдясно, текст до нея",
};

/**
 * The post body as blocks — text, a picture, a row of pictures — that can be
 * added anywhere and dragged (or arrowed) into any order. What comes out is
 * the same Markdown the site already renders, so nothing else has to change.
 */
export function PostContentBuilder({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const [blocks, setBlocks] = useState<PostBlock[]>(() => {
    const parsed = parsePostBlocks(value);
    return parsed.length ? parsed : [createPostBlock("text")];
  });
  // Uploads finish after other edits — they must build on the latest list,
  // not on the one their click handler saw.
  const latest = useRef(blocks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  function commit(next: PostBlock[]) {
    latest.current = next;
    setBlocks(next);
    onChange(serializePostBlocks(next));
  }

  function update(id: string, fn: (block: PostBlock) => PostBlock) {
    commit(latest.current.map((block) => (block.id === id ? fn(block) : block)));
  }

  function addBlock(type: PostBlockType, at: number) {
    const block = createPostBlock(type);
    const next = [...latest.current];
    next.splice(Math.min(Math.max(at, 0), next.length), 0, block);
    commit(next);
    setFocusId(block.id);
  }

  function removeBlock(block: PostBlock) {
    if (
      block.type === "text" &&
      !isEmptyPostBlock(block) &&
      !window.confirm("Да изтрия ли този текст?")
    ) {
      return;
    }
    commit(latest.current.filter((b) => b.id !== block.id));
  }

  function cancelDrag() {
    setDragId(null);
    setDropIndex(null);
  }

  function commitDrop() {
    if (dragId !== null && dropIndex !== null) {
      const from = latest.current.findIndex((block) => block.id === dragId);
      if (from >= 0) {
        const to = dropIndex > from ? dropIndex - 1 : dropIndex;
        if (to !== from) commit(movePostBlock(latest.current, from, to));
      }
    }
    cancelDrag();
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          if (!dragId) return;
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (!dragId) return;
          event.preventDefault();
          commitDrop();
        }}
      >
        {blocks.map((block, index) => (
          <div key={block.id}>
            <DropLine active={dragId !== null && dropIndex === index} />
            <InsertBar
              hidden={dragId !== null}
              onAdd={(type) => addBlock(type, index)}
            />
            <BlockCard
              block={block}
              index={index}
              total={blocks.length}
              nextIsText={blocks[index + 1]?.type === "text"}
              autoFocus={focusId === block.id}
              dragging={dragId === block.id}
              onDragStart={() => setDragId(block.id)}
              onDragEnd={cancelDrag}
              onDragOverCard={(after) => setDropIndex(index + (after ? 1 : 0))}
              onUpdate={(fn) => update(block.id, fn)}
              onMove={(direction) =>
                commit(movePostBlock(latest.current, index, index + direction))
              }
              onRemove={() => removeBlock(block)}
            />
          </div>
        ))}
        <DropLine active={dragId !== null && dropIndex === blocks.length} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ink/20 bg-cream/40 p-2">
        <span className="px-1 text-xs font-semibold text-ink-soft">Добави:</span>
        {BLOCK_TYPES.map((type) => {
          const Icon = BLOCK_ICONS[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type, blocks.length)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 text-sm font-medium hover:border-forest-500/40 hover:bg-forest-500/5"
            >
              <Icon className="h-4 w-4 text-forest-700" />
              {POST_BLOCK_LABELS[type]}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">
        Влачи блок за дръжката <GripVertical className="inline h-3.5 w-3.5" />{" "}
        или го мести със стрелките. Снимка „вляво“ или „вдясно“ се обтича от
        текста, който е след нея.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- one block */

function BlockCard({
  block,
  index,
  total,
  nextIsText,
  autoFocus,
  dragging,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onUpdate,
  onMove,
  onRemove,
}: {
  block: PostBlock;
  index: number;
  total: number;
  nextIsText: boolean;
  autoFocus: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverCard: (after: boolean) => void;
  onUpdate: (fn: (block: PostBlock) => PostBlock) => void;
  onMove: (direction: -1 | 1) => void;
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
        "rounded-xl border border-ink/10 bg-white transition-opacity",
        dragging && "opacity-40",
      )}
    >
      {/* Only the header row is draggable — the editor below keeps normal
          text selection inside its inputs. */}
      <div
        draggable
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
        className="flex items-center gap-1.5 border-b border-ink/10 px-1.5 py-1 sm:gap-2 sm:px-2"
      >
        <span
          title="Влачи, за да преместиш"
          className="inline-flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-ink-soft/60 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-forest-500/10 text-forest-700">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          {POST_BLOCK_LABELS[block.type]}
          {block.type === "gallery" && block.images.length > 0
            ? ` · ${block.images.length}`
            : ""}
        </span>
        <div className="flex shrink-0 items-center">
          <IconAction label="Нагоре" disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="h-4 w-4" />
          </IconAction>
          <IconAction
            label="Надолу"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </IconAction>
          <IconAction label="Изтрий" onClick={onRemove} danger>
            <Trash2 className="h-4 w-4" />
          </IconAction>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {block.type === "text" && (
          <TextBlockEditor
            block={block}
            autoFocus={autoFocus}
            onChange={(next) => onUpdate(() => next)}
          />
        )}
        {block.type === "image" && (
          <ImageBlockEditor
            block={block}
            nextIsText={nextIsText}
            onChange={(next) => onUpdate(() => next)}
            onMakeGallery={() =>
              onUpdate((b) =>
                b.type === "image"
                  ? {
                      id: b.id,
                      type: "gallery",
                      images: b.image.src.trim() ? [b.image] : [],
                    }
                  : b,
              )
            }
          />
        )}
        {block.type === "gallery" && (
          <GalleryBlockEditor
            block={block}
            onUpdate={(fn) => onUpdate((b) => (b.type === "gallery" ? fn(b) : b))}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- text */

function TextBlockEditor({
  block,
  autoFocus,
  onChange,
}: {
  block: TextBlock;
  autoFocus: boolean;
  onChange: (next: TextBlock) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = block.text.split("\n").length;

  return (
    <>
      <MarkdownLinkToolbar
        textareaRef={ref}
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
      />
      <Textarea
        ref={ref}
        autoFocus={autoFocus}
        rows={Math.min(Math.max(lines + 1, 4), 24)}
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        placeholder="Пиши тук — ## заглавие, **удебелен**, - списък…"
        className="field-sizing-content max-h-[70vh] font-mono text-[13px]"
      />
    </>
  );
}

/* ------------------------------------------------------------------ image */

function ImageBlockEditor({
  block,
  nextIsText,
  onChange,
  onMakeGallery,
}: {
  block: ImageBlock;
  nextIsText: boolean;
  onChange: (next: ImageBlock) => void;
  onMakeGallery: () => void;
}) {
  const { image, layout } = block;
  const floats = layout === "left" || layout === "right";

  function setImage(patch: Partial<PostImage>) {
    onChange({ ...block, image: { ...image, ...patch } });
  }

  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Снимка"
        hint="JPEG, PNG, WebP — до 5 MB. Показва се цялата, без изрязване."
        value={image.src}
        onChange={(src) => setImage({ src })}
        folder="blog"
        previewFit="contain"
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Къде стои спрямо текста</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {IMAGE_LAYOUTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ ...block, layout: option })}
              aria-pressed={layout === option}
              className={cn(
                "flex flex-col items-stretch gap-2 rounded-xl border p-2.5 text-left text-xs font-medium transition-colors",
                layout === option
                  ? "border-forest-500/60 bg-forest-50 text-forest-700"
                  : "border-ink/10 bg-white text-ink hover:border-forest-500/30",
              )}
            >
              <LayoutGlyph layout={option} />
              {LAYOUT_LABELS[option]}
            </button>
          ))}
        </div>
        {floats && (
          <p
            className={cn(
              "mt-2 text-xs leading-relaxed",
              nextIsText ? "text-ink-soft" : "text-gold-600",
            )}
          >
            {nextIsText
              ? `Текстът от следващия блок тече ${layout === "left" ? "отдясно" : "отляво"} на снимката. На телефон снимката е на цяла ширина.`
              : "Сложи текстов блок след снимката — той ще я обтича."}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Надпис под снимката" hint="По избор.">
          <Input
            value={image.caption}
            onChange={(e) => setImage({ caption: e.target.value })}
            className="py-2"
          />
        </Field>
        <Field label="Описание (alt)" hint="За Google и незрящи. Празно = надписа.">
          <Input
            value={image.alt}
            onChange={(e) => setImage({ alt: e.target.value })}
            className="py-2"
          />
        </Field>
      </div>
      <Field
        label="Линк при клик"
        hint="По избор — напр. YouTube видео или /programs/21-dni."
      >
        <Input
          value={image.href}
          onChange={(e) => setImage({ href: e.target.value })}
          placeholder="https://… или /programs/…"
          spellCheck={false}
          className="py-2 font-mono text-xs"
        />
      </Field>

      <button
        type="button"
        onClick={onMakeGallery}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        <Images className="h-3.5 w-3.5" />
        Още снимки една до друга (галерия)
      </button>
    </div>
  );
}

/** A tiny sketch of where the picture sits against the lines of text. */
function LayoutGlyph({ layout }: { layout: ImageLayout }) {
  const picture = "block rounded-sm bg-forest-500/45";
  const line = "block h-0.5 rounded-full bg-ink/25";

  if (layout === "left" || layout === "right") {
    return (
      <span
        className={cn(
          "flex h-9 items-center gap-1.5",
          layout === "right" && "flex-row-reverse",
        )}
      >
        <span className={cn(picture, "h-7 w-6 shrink-0")} />
        <span className="flex flex-1 flex-col gap-1">
          <span className={line} />
          <span className={line} />
          <span className={cn(line, "w-4/5")} />
          <span className={line} />
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-9 flex-col justify-center gap-1">
      <span className={cn(picture, "h-5", layout === "center" ? "mx-auto w-3/5" : "w-full")} />
      <span className={line} />
      <span className={cn(line, "w-4/5")} />
    </span>
  );
}

/* ---------------------------------------------------------------- gallery */

function GalleryBlockEditor({
  block,
  onUpdate,
}: {
  block: GalleryBlock;
  onUpdate: (fn: (block: GalleryBlock) => GalleryBlock) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { images } = block;

  function patchImage(index: number, patch: Partial<PostImage>) {
    onUpdate((b) => ({
      ...b,
      images: b.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    onUpdate((b) => {
      const to = index + direction;
      if (to < 0 || to >= b.images.length) return b;
      const next = [...b.images];
      [next[index], next[to]] = [next[to], next[index]];
      return { ...b, images: next };
    });
  }

  async function addFiles(picked: File[]) {
    const files = picked.filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      setError("Само изображения (JPEG, PNG, WebP…).");
      return;
    }
    setError(null);
    setProgress({ done: 0, total: files.length });

    // One at a time, so the pictures land in the order they were picked.
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      const res = await uploadSiteImage(file, "blog");
      if (res.ok) {
        onUpdate((b) => ({ ...b, images: [...b.images, emptyPostImage(res.url)] }));
      } else {
        failed.push(`${file.name}: ${res.message}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setProgress(null);
    if (failed.length) setError(failed.join(" · "));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={`${image.src}-${index}`}
            className="rounded-xl border border-ink/10 bg-cream/40 p-2"
          >
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt=""
                className="aspect-[4/3] w-full rounded-lg bg-cream-2 object-contain"
              />
              <div className="absolute inset-x-1 top-1 flex justify-between">
                <div className="flex gap-1">
                  <ThumbAction
                    label="Наляво"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </ThumbAction>
                  <ThumbAction
                    label="Надясно"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </ThumbAction>
                </div>
                <ThumbAction
                  label="Махни снимката"
                  onClick={() =>
                    onUpdate((b) => ({
                      ...b,
                      images: b.images.filter((_, i) => i !== index),
                    }))
                  }
                  danger
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </ThumbAction>
              </div>
            </div>
            <input
              value={image.caption}
              onChange={(e) => patchImage(index, { caption: e.target.value })}
              placeholder="Надпис (по избор)"
              className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-forest-400"
            />
          </div>
        ))}

        <button
          type="button"
          disabled={progress !== null}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(false);
            if (progress === null) void addFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex min-h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 text-center text-xs text-ink-soft transition-colors",
            dragOver
              ? "border-forest-500 bg-forest-50/50"
              : "border-ink/20 bg-cream-2/40 hover:border-forest-500/40",
          )}
        >
          {progress ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-forest-600" />
              Качване {Math.min(progress.done + 1, progress.total)}/{progress.total}…
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-ink-soft/60" />
              <span className="font-semibold text-ink">Добави снимки</span>
              <span>Пусни тук или кликни — може няколко наведнъж</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void addFiles(files);
        }}
      />

      {error && <p className="text-sm text-coral-600">{error}</p>}
      <p className="text-xs leading-relaxed text-ink-soft">
        На сайта: 2 или 4 снимки — по две на ред, иначе по три (на телефон по
        две). Всяка се показва цяла, без изрязване.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- bits */

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

function ThumbAction({
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
        "inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-ink shadow-sm hover:bg-white disabled:opacity-30",
        danger && "hover:text-coral-600",
      )}
    >
      {children}
    </button>
  );
}

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

/** „+ Текст / Снимка / Галерия“ between two blocks, shown on hover (always on touch screens). */
function InsertBar({
  hidden,
  onAdd,
}: {
  hidden: boolean;
  onAdd: (type: PostBlockType) => void;
}) {
  if (hidden) return <div className="h-2" />;
  return (
    <div className="group flex h-7 items-center justify-center gap-1">
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          title={`Вмъкни ${POST_BLOCK_LABELS[type].toLowerCase()} тук`}
          className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold text-forest-700 opacity-0 transition-opacity hover:bg-forest-500/10 focus:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
        >
          <Plus className="h-3 w-3" />
          {POST_BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
