"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { runAutomationCatchUpNow } from "@/app/(admin)/admin/actions";
import type { AutomationHealthIssue } from "@/lib/automation/health";
import { cn } from "@/lib/utils";

/**
 * What would stop an enabled automation from going out, plus a button to
 * queue steps people already missed (the same job the daily cron runs).
 */
export function AutomationHealthPanel({
  issues,
  cronConfigured,
}: {
  issues: AutomationHealthIssue[];
  cronConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  function catchUp() {
    setResult(null);
    startTransition(async () => {
      const res = await runAutomationCatchUpNow();
      setResult({ ok: res.ok, message: res.message ?? (res.ok ? "Готово." : "Неуспешно.") });
      router.refresh();
    });
  }

  return (
    <section className="mb-6 space-y-3 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium text-ink">
            {errors.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-coral-600" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-forest-600" aria-hidden />
            )}
            {errors.length > 0
              ? `${errors.length} включен${errors.length === 1 ? "а стъпка няма" : "и стъпки няма"} да тръгн${errors.length === 1 ? "е" : "ат"}`
              : "Всички включени стъпки могат да тръгнат"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Всяка стъпка, която не тръгне за някого, се записва с причината в отчета си
            („пропуснат“ / „грешка“). Пропуснатите стъпки се наваксват всеки ден
            {cronConfigured ? "" : " — само ако е зададен CRON_SECRET"}.
          </p>
        </div>
        <button
          type="button"
          onClick={catchUp}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-cream disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Навакса пропуснатите сега
        </button>
      </div>

      {!cronConfigured && (
        <p className="rounded-lg bg-gold-400/15 px-3 py-2 text-xs text-ink">
          <code>CRON_SECRET</code> не е зададен — ежедневното наваксване на пропуснати стъпки
          не работи. Задай го във Vercel → Settings → Environment Variables (произволен дълъг
          низ) и направи нов deploy.
        </p>
      )}

      {issues.length > 0 && (
        <ul className="space-y-1.5">
          {[...errors, ...warnings].map((issue) => (
            <li
              key={`${issue.automationId}-${issue.message}`}
              className={cn(
                "rounded-lg px-3 py-2 text-xs leading-relaxed",
                issue.level === "error"
                  ? "bg-coral-500/10 text-coral-700"
                  : "bg-gold-400/15 text-ink",
              )}
            >
              <strong className="font-semibold">{issue.name}</strong> — {issue.message}
            </li>
          ))}
        </ul>
      )}

      {result && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-xs",
            result.ok ? "bg-forest-500/10 text-forest-800" : "bg-coral-500/10 text-coral-700",
          )}
        >
          {result.message}
        </p>
      )}
    </section>
  );
}
