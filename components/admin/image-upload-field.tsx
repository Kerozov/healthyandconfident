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

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

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

  return (
    <Field label={label} hint={hint}>
      <div className={cn("space-y-3", className)}>
        {value ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className="max-h-40 rounded-xl border border-ink/10 object-cover"
            />
          </div>
        ) : (
          <div className="flex h-28 w-full max-w-xs items-center justify-center rounded-xl border border-dashed border-ink/20 bg-cream-2/40 text-xs text-ink-soft">
            Няма снимка
          </div>
        )}

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
