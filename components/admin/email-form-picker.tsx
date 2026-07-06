"use client";

import { Plus } from "lucide-react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import {
  extractFormIdsFromHtml,
  formEmailMarker,
} from "@/lib/email/forms-block";
import { cn } from "@/lib/utils";

export function EmailFormPicker({
  forms,
  locale,
  html,
  onInsert,
  disabled,
}: {
  forms: FormTemplateRecord[];
  locale: "bg" | "en";
  html: string;
  onInsert: (nextHtml: string) => void;
  disabled?: boolean;
}) {
  const attached = new Set(extractFormIdsFromHtml(html));
  const sorted = [...forms].sort((a, b) =>
    a.name.localeCompare(b.name, "bg"),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Няма форми — създай ги в Admin → Форми.
      </p>
    );
  }

  function addForm(formId: string) {
    onInsert(`${html}${formEmailMarker(formId)}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        Формите се вмъкват като карточка с бутон. При изпращане всеки получател
        получава личен линк за попълване.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sorted.map((form) => {
          const title = locale === "en" ? form.title_en : form.title_bg;
          const isAttached = attached.has(form.id.toLowerCase());

          return (
            <div
              key={form.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                isAttached
                  ? "border-forest-500/30 bg-forest-500/5"
                  : "border-ink/10 bg-white",
                !form.enabled && "opacity-60",
              )}
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-forest-500/10 text-lg">
                📋
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {title || form.name}
                </p>
                <p className="truncate text-xs text-ink-soft">/{form.slug}</p>
                {isAttached && (
                  <p className="text-[11px] text-forest-700">Вече в имейла</p>
                )}
              </div>
              <button
                type="button"
                disabled={disabled || !form.enabled}
                onClick={() => addForm(form.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Добави
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
