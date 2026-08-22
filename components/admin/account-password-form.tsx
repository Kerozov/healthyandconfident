"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { changeOwnPassword } from "@/app/(admin)/admin/team-actions";
import { Field, Input } from "@/components/admin/fields";
import { AdminButton } from "@/components/admin/ui";

export function AccountPasswordForm() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
      >
        <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
        Смяна на парола
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await changeOwnPassword({ currentPassword, nextPassword });
    setPending(false);
    if (!res.ok) {
      setError(res.message || "Неуспешна смяна.");
      return;
    }
    setMessage(res.message || "Паролата е сменена.");
    setCurrentPassword("");
    setNextPassword("");
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-ink/10 p-3">
      <p className="text-sm font-medium text-ink">Нова парола</p>
      <Field label="Текуща" htmlFor="own-current-password">
        <Input
          id="own-current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </Field>
      <Field label="Нова" htmlFor="own-next-password">
        <Input
          id="own-next-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={nextPassword}
          onChange={(e) => setNextPassword(e.target.value)}
        />
      </Field>
      {error ? (
        <p className="text-xs text-coral-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-xs text-forest-700">{message}</p> : null}
      <div className="flex gap-2">
        <AdminButton type="submit" size="sm" disabled={pending}>
          {pending ? "Запис…" : "Запази"}
        </AdminButton>
        <AdminButton
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
            setMessage(null);
          }}
        >
          Затвори
        </AdminButton>
      </div>
    </form>
  );
}
