"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";

/**
 * Shown when the session could not be read because the database was briefly
 * unreachable. The cookie is still valid, so this must never look like a
 * logout: no redirect, no "sign in again" — just a red error and a retry.
 */
export function AdminSessionError({ detail }: { detail?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tried, setTried] = useState(false);

  function retry() {
    setTried(true);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-6">
      <div className="w-full rounded-2xl border border-coral-300 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-coral-600" />
          <div>
            <h1 className="font-display text-xl font-semibold text-coral-700">
              Връзката с базата се разпадна
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Това не е излизане от профила — още си влязъл. Заявката просто не
              стигна до базата. Опитай пак след момент.
            </p>
            {detail ? (
              <p className="mt-2 break-words font-mono text-xs text-ink-soft/70">
                {detail}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={retry}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {pending ? "Опитвам…" : "Опитай отново"}
          </button>
          {tried && !pending ? (
            <span className="text-xs text-ink-soft">
              Ако продължава, провери Supabase.
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
