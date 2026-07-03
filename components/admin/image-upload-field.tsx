"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadSiteImage } from "@/app/(admin)/admin/actions";
import type { MediaFolder } from "@/lib/media/folders";
import { Field } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  folder,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder: MediaFolder;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile() {
    inputRef.current?.click();
  }

  function uploadFile(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);

    startTransition(async () => {
      const res = await uploadSiteImage(formData);
      if (!res.ok || !res.url) {
        setError(res.message || "Качването неуспешно.");
        return;
      }
      onChange(res.url);
    });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || pending) return;
    if (!file.type.startsWith("image/")) {
      setError("Само изображения (JPEG, PNG, WebP…).");
      return;
    }
    uploadFile(file);
  }

  return (
    <Field label={label} hint={hint}>
      <div className={cn("space-y-3", className)}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!pending) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={!value && !pending ? pickFile : undefined}
          className={cn(
            "relative overflow-hidden rounded-xl border transition",
            value ? "border-ink/10" : "cursor-pointer border-dashed",
            dragOver
              ? "border-forest-500 bg-forest-50/50"
              : value
                ? "bg-white"
                : "border-ink/20 bg-cream-2/40 hover:border-forest-500/40",
          )}
        >
          {value ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt=""
                className="max-h-40 rounded-xl object-cover"
              />
            </div>
          ) : (
            <div className="flex h-28 w-full max-w-xs flex-col items-center justify-center gap-1 px-4 text-center text-xs text-ink-soft">
              {pending ? (
                <Loader2 className="h-6 w-6 animate-spin text-forest-600" />
              ) : (
                <>
                  <ImagePlus className="h-6 w-6 text-ink-soft/60" />
                  <span>Пусни снимка тук или кликни</span>
                </>
              )}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={pending}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 bg-white px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {pending ? "Качване…" : value ? "Смени снимката" : "Качи снимка"}
          </button>
          {value && !pending && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
            >
              <Trash2 className="h-4 w-4" />
              Премахни
            </button>
          )}
        </div>

        {error && <p className="text-sm text-coral-600">{error}</p>}
      </div>
    </Field>
  );
}
