"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-coral-200 bg-white p-8 text-center shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Админ панелът не се зареди
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Сървърната заявка е прекъсната (често при голям списък абонати). Опитай
        отново или отвори директно Абонати.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-ink-soft/70">
          ERROR {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700"
        >
          Опитай отново
        </button>
        <Link
          href="/admin/subscribers"
          className="inline-flex h-10 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
        >
          Към Абонати
        </Link>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
        >
          Табло
        </Link>
      </div>
    </div>
  );
}
