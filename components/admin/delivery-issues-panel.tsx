"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { EyeOff, Loader2, MailX, RefreshCw, Search, Send } from "lucide-react";
import {
  getDeliveryIssuesReport,
  sendAutomationNow,
  setDeliveryIssuesIgnored,
} from "@/app/(admin)/admin/actions";
import type {
  DeliveryIssue,
  DeliveryIssueKind,
  DeliveryIssuesReport,
} from "@/lib/admin/delivery-issues";
import { Card } from "@/components/admin/fields";
import {
  DEFAULT_SEND_PACING_MINUTES,
  SEND_PACING_OPTIONS,
  pacingDurationLabel,
} from "@/lib/automation/send-pacing";
import { cn, formatDate } from "@/lib/utils";

const KIND_LABELS: Record<DeliveryIssueKind, string> = {
  missing: "Без запис",
  failed: "Неуспешен",
  skipped: "Пропуснат",
  bounced: "Върнат",
};

const KIND_TONE: Record<DeliveryIssueKind, string> = {
  missing: "bg-coral-500/15 text-coral-700",
  failed: "bg-coral-500/15 text-coral-700",
  skipped: "bg-amber-500/15 text-amber-800",
  bounced: "bg-ink/10 text-ink-soft",
};

type Group = { automationId: string; automationName: string; issues: DeliveryIssue[] };

/**
 * "Send to all" covers only people the step was meant for and never reached.
 * A skip is usually deliberate (outside the audience, step off) — those go one
 * by one, after reading the reason.
 */
function bulkSendable(issues: DeliveryIssue[]): DeliveryIssue[] {
  return issues.filter((i) => i.canSend && (i.kind === "missing" || i.kind === "failed"));
}

/**
 * Who an automation did not reach, and why — including people with no delivery
 * row at all, which the automation's own report cannot show. From here they
 * get the step now (and the rest of the sequence after it), or are ignored.
 */
export function DeliveryIssuesPanel({
  period,
  canSend,
}: {
  period: number;
  canSend: boolean;
}) {
  const [report, setReport] = useState<DeliveryIssuesReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<DeliveryIssueKind | "all">("all");
  const [pacing, setPacing] = useState<number>(DEFAULT_SEND_PACING_MINUTES);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await getDeliveryIssuesReport(period);
    if (res.ok) setReport(res.report);
    else setLoadError(res.message);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const groups = useMemo<Group[]>(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    const byId = new Map<string, Group>();
    for (const issue of report.issues) {
      if (kind !== "all" && issue.kind !== kind) continue;
      if (
        q &&
        !issue.email.includes(q) &&
        !(issue.name ?? "").toLowerCase().includes(q)
      ) {
        continue;
      }
      const group = byId.get(issue.automationId) ?? {
        automationId: issue.automationId,
        automationName: issue.automationName,
        issues: [],
      };
      group.issues.push(issue);
      byId.set(issue.automationId, group);
    }
    return [...byId.values()].sort((a, b) => b.issues.length - a.issues.length);
  }, [report, query, kind]);

  const kindCounts = useMemo(() => {
    const counts: Record<DeliveryIssueKind, number> = { missing: 0, failed: 0, skipped: 0, bounced: 0 };
    for (const issue of report?.issues ?? []) counts[issue.kind] += 1;
    return counts;
  }, [report]);

  function send(group: Group, issues: DeliveryIssue[], key: string) {
    const emails = issues.filter((i) => i.canSend).map((i) => i.email);
    if (emails.length === 0) return;
    // One person goes now; a group goes at the chosen pace.
    const spacingMinutes = emails.length > 1 ? pacing : 0;
    const spread = pacingDurationLabel(emails.length, spacingMinutes);
    if (
      emails.length > 1 &&
      !confirm(
        `Да изпратя „${group.automationName}“ на ${emails.length} души, които не са го получили?\n\n` +
          (spread
            ? `Темпо: ${SEND_PACING_OPTIONS.find((o) => o.minutes === spacingMinutes)?.label.toLowerCase()} — последният тръгва след ${spread}.`
            : "Всички тръгват наведнъж.") +
          "\nСледващите стъпки от поредицата идват след него със своите закъснения.",
      )
    ) {
      return;
    }
    setBusyKey(key);
    setNote(null);
    startTransition(async () => {
      const res = await sendAutomationNow(group.automationId, {
        mode: "emails",
        emails: emails.join("\n"),
        resend: false,
        continueChain: true,
        spacingMinutes,
      });
      setNote({ ok: res.ok, text: res.message ?? (res.ok ? "Изпратено." : "Неуспешно.") });
      await load();
      setBusyKey(null);
    });
  }

  function ignore(group: Group, issues: DeliveryIssue[], key: string) {
    if (issues.length > 1 && !confirm(`Да скрия ${issues.length} души от този списък?`)) return;
    setBusyKey(key);
    setNote(null);
    startTransition(async () => {
      const res = await setDeliveryIssuesIgnored({
        automationId: group.automationId,
        emails: issues.map((i) => i.email),
        ignored: true,
      });
      if (!res.ok) setNote({ ok: false, text: res.message ?? "Неуспешно." });
      else {
        // Drop them locally — a full reload re-runs the whole check.
        const hidden = new Set(issues.map((i) => `${i.automationId}|${i.email}`));
        setReport((r) =>
          r
            ? {
                ...r,
                ignored: r.ignored + hidden.size,
                issues: r.issues.filter((i) => !hidden.has(`${i.automationId}|${i.email}`)),
              }
            : r,
        );
      }
      setBusyKey(null);
    });
  }

  const total = report?.issues.length ?? 0;
  const busy = busyKey !== null;

  return (
    <Card
      className="mt-6"
      title="Не са получили"
      action={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-3 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Провери пак
        </button>
      }
    >
      <p className="-mt-3 mb-4 text-sm text-ink-soft">
        Хора, до които автоматизация не е стигнала в избрания период, и защо. „Без запис“ значи,
        че автоматизацията изобщо не е тръгнала за тях (напр. грешка при записването).
        „Изпрати“ на ред праща на един човек веднага; „Изпрати на всички“ ги разпределя
        във времето според темпото. Поредицата продължава след това със своите закъснения.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Търси по имейл или име"
            aria-label="Търси по имейл или име"
            className="h-10 w-full rounded-full border border-ink/15 bg-white pl-9 pr-4 text-sm text-ink outline-none placeholder:text-ink-soft/50 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20"
          />
        </label>
        {canSend && (
          <label className="flex items-center gap-2 text-xs text-ink-soft sm:ml-auto sm:order-last">
            Темпо при „Изпрати на всички“
            <select
              value={pacing}
              onChange={(e) => setPacing(Number(e.target.value))}
              disabled={busy}
              className="h-8 rounded-full border border-ink/15 bg-white px-2 text-xs text-ink"
            >
              {SEND_PACING_OPTIONS.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {(["all", "missing", "failed", "skipped", "bounced"] as const).map((k) => {
          const count = k === "all" ? total : kindCounts[k];
          if (k !== "all" && count === 0) return null;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold",
                kind === k
                  ? "bg-forest-600 text-cream"
                  : "bg-ink/5 text-ink-soft hover:bg-ink/10",
              )}
            >
              {k === "all" ? "Всички" : KIND_LABELS[k]} · {count}
            </button>
          );
        })}
      </div>

      {note && (
        <p
          role="status"
          className={cn("mb-4 text-sm", note.ok ? "text-forest-700" : "text-coral-600")}
        >
          {note.text}
        </p>
      )}

      {loading && !report ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          Проверявам кой не е получил…
        </p>
      ) : loadError ? (
        <p className="text-sm text-coral-600">{loadError}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {total === 0 ? "Всички са получили — няма пропуски в този период." : "Няма съвпадения."}
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const sendable = bulkSendable(group.issues);
            const groupKey = `g:${group.automationId}`;
            return (
              <section key={group.automationId} className="rounded-xl border border-ink/10">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-cream-2/40 px-4 py-3">
                  <p className="min-w-0 text-sm">
                    <MailX className="mr-1.5 inline h-4 w-4 text-coral-500" />
                    <span className="font-semibold text-ink">{group.automationName}</span>
                    <span className="text-ink-soft"> · {group.issues.length} не са получили</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canSend && sendable.length > 0 && (
                      <button
                        type="button"
                        onClick={() => send(group, sendable, groupKey)}
                        disabled={busy}
                        title="Само „Без запис“ и „Неуспешен“ — пропуснатите са по причина, прати ги поотделно"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-coral-500 px-3 text-xs font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
                      >
                        {busyKey === groupKey ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Изпрати на всички {sendable.length}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => ignore(group, group.issues, `${groupKey}:ignore`)}
                      disabled={busy}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 text-xs font-semibold text-ink-soft hover:bg-ink/5 disabled:opacity-60"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      Игнорирай всички
                    </button>
                  </div>
                </div>
                <ul className="max-h-[420px] divide-y divide-ink/5 overflow-y-auto">
                  {group.issues.map((issue) => {
                    const rowKey = `${issue.automationId}|${issue.email}`;
                    return (
                      <li
                        key={rowKey}
                        className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="break-all font-medium text-ink">{issue.email}</span>
                            {issue.name && <span className="text-ink-soft">{issue.name}</span>}
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                KIND_TONE[issue.kind],
                              )}
                            >
                              {KIND_LABELS[issue.kind]}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {issue.reason}
                            {issue.at && ` · ${formatDate(issue.at, "bg")}`}
                            {!issue.canSend && issue.kind !== "bounced" && " · не е активен абонат"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {canSend && issue.canSend && (
                            <button
                              type="button"
                              onClick={() => send(group, [issue], `${rowKey}:send`)}
                              disabled={busy}
                              className="inline-flex h-7 items-center gap-1 rounded-full bg-forest-500/10 px-2.5 text-xs font-semibold text-forest-700 hover:bg-forest-500/20 disabled:opacity-60"
                            >
                              {busyKey === `${rowKey}:send` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Изпрати
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => ignore(group, [issue], `${rowKey}:ignore`)}
                            disabled={busy}
                            title="Скрий от този списък"
                            className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-ink-soft hover:bg-ink/5 disabled:opacity-60"
                          >
                            <EyeOff className="h-3 w-3" />
                            Игнорирай
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {report && (report.ignored > 0 || report.truncated) && (
        <p className="mt-4 text-xs text-ink-soft">
          {report.ignored > 0 && `${report.ignored} игнорирани не се показват.`}
          {report.truncated && " Показани са първите 3000 — стесни периода."}
        </p>
      )}
    </Card>
  );
}
