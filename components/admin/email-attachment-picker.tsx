"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { createEmailAttachmentUpload } from "@/app/(admin)/admin/actions";
import {
  putToSignedUrl,
  uploadErrorText,
} from "@/lib/admin/upload-to-storage";
import { cn } from "@/lib/utils";

export function EmailAttachmentPicker({
  path,
  filename,
  onChange,
  label = "PDF прикачка",
  hint = "По избор — PDF файл, който се изпраща като прикачен към имейла.",
}: {
  path: string;
  filename: string;
  onChange: (path: string, filename: string) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(file: File | null) {
    if (!file) return;
    setError(null);

    startTransition(async () => {
      try {
        // Only the descriptor goes through the Server Action; the PDF itself
        // goes browser → Storage, so size is capped by the bucket, not by Next.
        const res = await createEmailAttachmentUpload({
          name: file.name,
          type: file.type,
          size: file.size,
        });
        if (!res.ok || !res.ticket) {
          setError(res.message ?? "Качването не успя.");
          return;
        }

        const put = await putToSignedUrl(res.ticket.uploadUrl, file);
        if (!put.ok) {
          setError(put.message);
          return;
        }

        onChange(res.ticket.path, res.ticket.filename);
      } catch (err) {
        setError(uploadErrorText(err));
      }
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}

      {path && filename ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-forest-100 bg-cream/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-forest-600" />
            <span className="truncate text-sm font-medium text-slate-800">
              {filename}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
            title="Премахни PDF"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-dashed border-forest-200 bg-white px-4 py-3 text-sm font-medium text-forest-700 transition-colors hover:border-forest-400 hover:bg-cream/50 disabled:opacity-60",
          )}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Качи PDF
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-coral-600">{error}</p> : null}
    </div>
  );
}
