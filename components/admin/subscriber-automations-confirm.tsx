"use client";

import { useEffect } from "react";
import { Loader2, Mail, MessageSquare, X } from "lucide-react";
import type { SubscriberAutomationPreviewItem } from "@/app/(admin)/admin/actions";

function automationsCount(n: number): string {
  return n === 1 ? "1 автоматизация" : `${n} автоматизации`;
}

/**
 * Asked after new groups are set on a subscriber: which automations the save
 * would start, and whether to start them or only record the groups.
 */
export function SubscriberAutomationsConfirm({
  email,
  automations,
  checkError,
  busy,
  onStart,
  onSkip,
  onCancel,
}: {
  email: string;
  automations: SubscriberAutomationPreviewItem[];
  /** The check failed — the list is unknown. */
  checkError: string | null;
  busy: boolean;
  onStart: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscriber-automations-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="subscriber-automations-title" className="font-semibold text-ink">
              Да тръгнат ли автоматизациите?
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">{email}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Затвори"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
          {checkError ? (
            <p className="rounded-xl border border-coral-200 bg-coral-500/10 px-3 py-2 text-coral-800">
              Не успях да проверя кои автоматизации ще тръгнат: {checkError}. Ако ги
              пуснеш, тръгват всички „Влизане в група“, в които човекът влиза сега.
            </p>
          ) : (
            <>
              <p className="text-ink">
                С новите групи човекът влиза в {automationsCount(automations.length)}:
              </p>
              <ul className="space-y-2">
                {automations.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-ink/10 px-3 py-2.5"
                  >
                    {a.channel === "sms" ? (
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-label="SMS" />
                    ) : (
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" aria-label="Имейл" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{a.name}</p>
                      <p className="text-xs text-ink-soft">
                        {[a.afterName ? `след „${a.afterName}“` : null, a.when || null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-ink-soft">
            „Запази без тях“ записва групите, но писма от тези автоматизации няма да
            тръгнат.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-ink/5 disabled:opacity-60"
          >
            Откажи
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5 disabled:opacity-60"
          >
            Запази без тях
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Запази и пусни
          </button>
        </div>
      </div>
    </div>
  );
}
