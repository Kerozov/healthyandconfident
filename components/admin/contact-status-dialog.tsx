"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { setSubscribersStatus } from "@/app/(admin)/admin/contact-actions";
import { Textarea } from "@/components/admin/fields";
import { StatusBadge } from "@/components/admin/contact-status-badge";
import { statusColorClasses } from "@/lib/admin/contact-crm";
import type { ContactStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/** Pick a status (or none) and say why — for one person or a selection. */
export function ContactStatusDialog({
  ids,
  title,
  subtitle,
  statuses,
  currentStatusId = null,
  onClose,
  onSaved,
}: {
  ids: string[];
  title: string;
  subtitle?: string;
  statuses: ContactStatus[];
  currentStatusId?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [statusId, setStatusId] = useState<string | null>(currentStatusId);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setSubscribersStatus({ ids, statusId, comment });
      if (!res.ok) {
        setError(res.message ?? "Записът не успя.");
        return;
      }
      onSaved(res.message ?? "Статусът е записан.");
    });
  }

  const unchanged = statusId === currentStatusId && !comment.trim() && ids.length === 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-status-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="contact-status-title" className="font-semibold text-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Затвори"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {statuses.length === 0 ? (
            <p className="rounded-xl bg-gold-400/15 px-3 py-2.5 text-sm text-ink">
              Още няма статуси. Главният админ ги добавя в Абонати → Статуси.
            </p>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink">Статус</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {statuses.map((s) => {
                  const active = statusId === s.id;
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                        active ? statusColorClasses(s.color).soft : "border-ink/10 hover:border-ink/25",
                        active && "ring-1 ring-inset ring-ink/10",
                      )}
                    >
                      <input
                        type="radio"
                        name="contact-status"
                        checked={active}
                        disabled={pending}
                        onChange={() => setStatusId(s.id)}
                        className="h-4 w-4 shrink-0"
                      />
                      <StatusBadge name={s.name} color={s.color} />
                    </label>
                  );
                })}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 text-sm text-ink-soft",
                    statusId === null ? "border-ink/30 bg-cream/60" : "border-ink/15 hover:border-ink/25",
                  )}
                >
                  <input
                    type="radio"
                    name="contact-status"
                    checked={statusId === null}
                    disabled={pending}
                    onChange={() => setStatusId(null)}
                    className="h-4 w-4 shrink-0"
                  />
                  Без статус
                </label>
              </div>
            </fieldset>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Коментар</span>
            <Textarea
              value={comment}
              maxLength={2000}
              disabled={pending}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Какво се случи - напр. „Говорихме по телефона, ще реши до петък.“"
              className="min-h-[6rem]"
            />
            <span className="mt-1.5 block text-xs text-ink-soft">
              Записва се с твоето име и датата. Вижда се в таблицата и в историята на човека.
            </span>
          </label>

          {error && <p className="text-sm text-coral-700">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-ink/5 disabled:opacity-60"
          >
            Откажи
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || unchanged || statuses.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {ids.length > 1 ? `Запиши за ${ids.length} души` : "Запиши"}
          </button>
        </div>
      </div>
    </div>
  );
}
