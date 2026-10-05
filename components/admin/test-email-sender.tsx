"use client";

import { useEffect, useState, useTransition } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { sendTestEmail } from "@/app/(admin)/admin/actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin:test-email-to";

export type TestEmailContent = Omit<Parameters<typeof sendTestEmail>[0], "to">;

/**
 * Footer control: mails the email being edited to a typed address. The editor's
 * content is untouched — the point is to look at it in a real inbox and keep
 * going. The address is remembered per browser.
 */
export function TestEmailSender({
  content,
  disabled,
}: {
  content: TestEmailContent;
  disabled?: boolean;
}) {
  const [to, setTo] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  // Read after hydration so server and client markup match.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTo(stored);
    } catch {
      /* storage blocked — start empty */
    }
  }, []);

  function send() {
    setResult(null);
    startTransition(async () => {
      const res = await sendTestEmail({ ...content, to });
      setResult(res);
      if (res.ok) {
        try {
          window.localStorage.setItem(STORAGE_KEY, to.trim());
        } catch {
          /* ignore */
        }
      }
    });
  }

  const ready = Boolean(to.trim() && content.html.trim());

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <input
        type="text"
        inputMode="email"
        autoComplete="email"
        value={to}
        onChange={(e) => {
          setTo(e.target.value);
          setResult(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && ready && !pending && !disabled) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="тест@имейл.com"
        aria-label="Имейл за тест"
        className="h-11 min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-4 text-sm text-ink outline-none placeholder:text-ink-soft/50 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20 sm:w-60 sm:flex-none"
      />
      <button
        type="button"
        onClick={send}
        disabled={pending || disabled || !ready}
        title="Праща текущото съдържание само до този адрес. Нищо не се изтрива и не влиза в статистиките."
        className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FlaskConical className="h-4 w-4" />
        )}
        Изпрати тест
      </button>
      {result?.message && (
        <p
          role="status"
          className={cn("text-sm", result.ok ? "text-forest-600" : "text-coral-600")}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
