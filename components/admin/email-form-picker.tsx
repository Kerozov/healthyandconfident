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
        Вмъкват се като карточка с личен линк за всеки получател.
      </p>
      <div className="grid gap-2">
        {sorted.map((form) => {
          const title = locale === "en" ? form.title_en : form.title_bg;
          const isAttached = attached.has(form.id.toLowerCase());

          return (
            <div
              key={form.id}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border p-2.5 sm:gap-3 sm:p-3",
                isAttached
                  ? "border-forest-500/30 bg-forest-500/5"
                  : "border-ink/10 bg-white",
                !form.enabled && "opacity-60",
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-forest-500/10 text-base sm:h-14 sm:w-14 sm:text-lg">
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-1 sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold"
                aria-label="Добави"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Добави</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
