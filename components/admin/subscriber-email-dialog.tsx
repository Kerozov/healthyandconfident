"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { changeSubscriberEmail } from "@/app/(admin)/admin/actions";
import { Field, Input } from "@/components/admin/fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function countNote(n: number, one: string, many: string): string | null {
  if (n <= 0) return null;
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}

/**
 * Change one person's email. Everything follows the new address: their
 * history, queued automation emails, scheduled campaigns and payment reminders.
 */
export function SubscriberEmailDialog({
  subscriberId,
  email,
  onClose,
  onSaved,
}: {
  subscriberId: string;
  email: string;
  onClose: () => void;
  onSaved: (note: { ok: boolean; text: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(email);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onClose]);

  const next = value.trim().toLowerCase();
  const same = next === email.trim().toLowerCase();

  function save() {
    setError(null);
    if (!EMAIL_RE.test(next)) {
      setError("Имейлът не изглежда правилен.");
      return;
    }
    if (same) {
      onClose();
      return;
    }
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof changeSubscriberEmail>>;
      try {
        res = await changeSubscriberEmail({ id: subscriberId, email: next });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Смяната не успя.");
        return;
      }
      if (!res.ok) {
        setError(res.message || "Смяната не успя.");
        return;
      }
      const followed = [
        countNote(res.automations ?? 0, "имейл от автоматизация", "имейла от автоматизации"),
        countNote(res.campaigns ?? 0, "насрочена кампания", "насрочени кампании"),
        countNote(res.reminders ?? 0, "напомняне за плащане", "напомняния за плащане"),
      ].filter(Boolean);
      const warnings = res.warnings ?? [];
      const text = [
        `Имейлът е сменен: ${email} → ${res.email ?? next}.`,
        followed.length > 0 ? `Към новия имейл отиват и ${followed.join(", ")}.` : null,
        ...warnings,
      ]
        .filter(Boolean)
        .join(" ");
      onSaved({ ok: warnings.length === 0, text });
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={() => !pending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscriber-email-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="subscriber-email-title" className="font-semibold text-ink">
              Смяна на имейла
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">{email}</p>
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

        <form
          className="space-y-4 px-5 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field label="Нов имейл" htmlFor="subscriber-new-email">
            <Input
              id="subscriber-new-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending}
            />
          </Field>
          <p className="text-sm text-ink-soft">
            Всичко минава на новия имейл: историята (изпратени имейли, кликове, покупки,
            форми), чакащите имейли от автоматизации, насрочените кампании и напомнянията
            за плащане. Имейли, които вече се изпращат в момента, отиват на стария.
          </p>
          {error && <p className="text-sm text-coral-700">{error}</p>}
        </form>

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
            disabled={pending || same || !next}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Смени имейла
          </button>
        </div>
      </div>
    </div>
  );
}
