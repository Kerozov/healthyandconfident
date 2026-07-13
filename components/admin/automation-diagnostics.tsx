"use client";

import { useState, useTransition } from "react";
import { Loader2, Stethoscope, CheckCircle2, XCircle } from "lucide-react";
import { diagnoseAutomationsForEmail } from "@/app/(admin)/admin/actions";
import type { AutomationDiagnosis } from "@/lib/automation/run";
import { cn } from "@/lib/utils";

export function AutomationDiagnostics() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    subscriberFound: boolean;
    diagnosis: AutomationDiagnosis;
  } | null>(null);

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await diagnoseAutomationsForEmail(email);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult({ subscriberFound: res.subscriberFound, diagnosis: res.diagnosis });
    });
  }

  const d = result?.diagnosis;

  return (
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-forest-600" />
        <p className="font-medium text-ink">Диагностика — защо не се праща имейл?</p>
      </div>
      <p className="mt-1 text-xs text-ink-soft sm:text-sm">
        Въведи имейл на абонат и виж какво би се случило. Не изпраща нищо — само
        проверява.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="test@example.com"
          className="h-11 flex-1 rounded-lg border border-ink/15 px-3 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
        />
        <button
          type="button"
          onClick={run}
          disabled={pending || !email.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-forest-500 px-5 text-sm font-semibold text-white hover:bg-forest-600 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Провери
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-coral-600">{error}</p>}

      {d && (
        <div className="mt-4 space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusRow
              ok={d.workerConfigured}
              label="Worker конфигуриран"
              value={d.workerConfigured ? d.workerUrl : "липсват env"}
            />
            <StatusRow
              ok={!d.unsubscribed}
              label="Абонат активен"
              value={d.unsubscribed ? "отписан" : "да"}
            />
            <StatusRow
              ok={d.triggerEvents.length > 0}
              label="Тригер"
              value={d.triggerEvents.join(", ") || `source="${d.source}" не задейства`}
            />
            <StatusRow
              ok={d.enabledRulesForTrigger > 0}
              label="Включени автоматизации"
              value={String(d.enabledRulesForTrigger)}
            />
            <StatusRow
              ok={d.wouldSendCount > 0}
              label="Ще се изпратят"
              value={`${d.wouldSendCount} имейл(а)`}
            />
            <StatusRow
              ok
              label="From адрес"
              value={d.workerFrom}
            />
          </div>

          <div className="rounded-lg bg-cream-2/40 p-3 text-xs text-ink-soft">
            <span className="font-medium text-ink">Абонат:</span>{" "}
            {result?.subscriberFound
              ? `намерен · тагове: ${d.tags.join(", ") || "няма"}`
              : "НЕ е намерен в базата (симулация като нов). Провери имейла."}
          </div>

          {d.notes.length > 0 && (
            <ul className="space-y-1">
              {d.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-amber-800">
                  <span>⚠</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}

          {result?.subscriberFound &&
            d.rules.some((r) => r.reason === "already_queued_or_sent") && (
              <p className="rounded-lg border border-forest-200 bg-forest-50/50 px-3 py-2 text-xs text-forest-800">
                Абонатът е намерен. „Нови + стари“ работи — но стъпките, които вече са
                изпратени, не се пращат отново. За тест използвай друг имейл или изтрий
                доставката от историята на автоматизацията.
              </p>
            )}

          {d.rules.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-ink/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="px-3 py-2">Автоматизация</th>
                    <th className="px-3 py-2">Канал</th>
                    <th className="px-3 py-2">Резултат</th>
                    <th className="px-3 py-2">Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rules.map((rule, i) => (
                    <tr key={i} className="border-b border-ink/5 last:border-0">
                      <td className="px-3 py-2 font-medium">{rule.name}</td>
                      <td className="px-3 py-2 text-ink-soft">{rule.channel}</td>
                      <td className="px-3 py-2">
                        {rule.wouldSend ? (
                          <span className="inline-flex items-center gap-1 text-forest-700">
                            <CheckCircle2 className="h-4 w-4" /> Да
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-coral-700">
                            <XCircle className="h-4 w-4" /> Не
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-soft">
                        {translateReason(rule.reason)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function StatusRow({
  ok,
  label,
  value,
}: {
  ok: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink/10 px-3 py-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-forest-600" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-coral-600" />
      )}
      <span className="text-ink-soft">{label}:</span>
      <span className={cn("truncate font-medium", ok ? "text-ink" : "text-coral-700")}>
        {value}
      </span>
    </div>
  );
}

const REASONS: Record<string, string> = {
  new_subscribers_only:
    "настроена е само за нови абонати, а този вече съществува в списъка",
  purchase_segment_gate: "не влиза в сегмента за покупка",
  product_filter: "не съвпада с избрания продукт",
  already_queued_or_sent:
    "вече е изпратена/планирана за този имейл — не се дублира (дори при „нови + стари“)",
  waiting_for_parent_automation:
    "чака предходния имейл от веригата да се изпрати",
  chained_delay_not_from_parent: "част от верига — стартира се от родителя",
  "ще изпрати": "ще изпрати",
};

function translateReason(reason: string): string {
  if (REASONS[reason]) return REASONS[reason];
  if (reason.startsWith("audience")) {
    return `аудиторията не съвпада — ${reason.replace("audience ", "")}`;
  }
  if (reason.startsWith("signup_source")) {
    return `източникът не съвпада — ${reason.replace("signup_source ", "")}`;
  }
  if (reason.startsWith("празно съдържание")) return reason;
  return reason;
}
