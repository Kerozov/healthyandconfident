"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Download, FileText, Search, X } from "lucide-react";
import type {
  QuestionnaireChoiceQuestion,
  QuestionnaireFormOption,
  QuestionnaireReport,
  QuestionnaireResponse,
} from "@/lib/admin/questionnaire-report";
import type { ShareLink } from "@/lib/site/share-links";
import { ShareLinksPanel } from "@/components/admin/share-links";
import { AdminNavLink, useAdminNavigate } from "@/components/admin/admin-navigation";
import { Card } from "@/components/admin/fields";
import { Badge, DataTable } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/contact-status-badge";
import { formatDateTime, formatShortDate } from "@/lib/admin/contact-crm";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const BAR_TONES = ["bg-forest-500", "bg-gold-500", "bg-coral-500", "bg-sky-500", "bg-violet-500", "bg-emerald-500"];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

async function exportExcel(report: QuestionnaireReport, rows: QuestionnaireResponse[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      const line: Record<string, string> = {
        "Дата": formatDateTime(r.submittedAt),
        "Име": r.name ?? "",
        "Имейл": r.email ?? "",
        "Телефон": r.phone ?? "",
        "Статус": r.crmStatus?.name ?? "Без статус",
      };
      for (const row of r.rows) {
        // Two questions with the same label must not overwrite each other.
        let key = row.label;
        let n = 2;
        while (key in line) key = `${row.label} (${n++})`;
        line[key] = row.value;
      }
      return line;
    }),
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, report.form.name.slice(0, 31) || "Въпросник");
  XLSX.writeFile(book, `${report.form.slug}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function AnswersDialog({
  response,
  formName,
  onClose,
}: {
  response: QuestionnaireResponse;
  formName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="questionnaire-answers-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="questionnaire-answers-title" className="font-semibold text-ink">
              {response.name || response.email || "Без имейл"}
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {formName} · {formatDateTime(response.submittedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Затвори"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="flex-1 divide-y divide-ink/5 overflow-y-auto px-5">
          {response.rows.map((row, i) => (
            <div key={`${row.label}-${i}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-4">
              <dt className="text-sm text-ink-soft">{row.label}</dt>
              <dd className="whitespace-pre-line text-sm font-medium text-ink">{row.value || "-"}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col-reverse gap-2 border-t border-ink/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-ink/5"
          >
            Затвори
          </button>
          {response.subscriberId && (
            <AdminNavLink
              href={`/admin/subscribers/${response.subscriberId}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700"
            >
              Пълен профил <ChevronRight className="h-4 w-4" />
            </AdminNavLink>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  question,
  total,
  active,
  onPick,
}: {
  question: QuestionnaireChoiceQuestion;
  total: number;
  active: string | undefined;
  onPick: (value: string | null) => void;
}) {
  const max = Math.max(1, ...question.options.map((o) => o.count));
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-sm font-semibold leading-snug text-ink">{question.label}</p>
      <p className="mb-3 mt-0.5 text-xs text-ink-soft">
        {question.answered} от {total} отговорили{question.multiple ? " · може няколко" : ""}
      </p>
      <ul className="space-y-1.5">
        {question.options.map((option, i) => {
          const pct = total > 0 ? Math.round((option.count / total) * 100) : 0;
          const selected = active === option.value;
          return (
            <li key={option.value}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={option.count === 0 && !selected}
                onClick={() => onPick(selected ? null : option.value)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 disabled:cursor-default disabled:opacity-60",
                  selected
                    ? "border-forest-500/50 bg-forest-50"
                    : "border-transparent hover:border-forest-500/25 hover:bg-cream-2/40",
                )}
              >
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{option.label}</span>
                  <span className="shrink-0 tabular-nums text-ink-soft">
                    <strong className="text-ink">{option.count}</strong> · {pct}%
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/5">
                  <span
                    className={cn("block h-full rounded-full", BAR_TONES[i % BAR_TONES.length])}
                    style={{ width: `${Math.round((option.count / max) * 100)}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function QuestionnaireView({
  forms,
  report,
  links,
  sitePanel,
}: {
  forms: QuestionnaireFormOption[];
  report: QuestionnaireReport | null;
  links: ShareLink[];
  /** „На сайта“ — the menu item and home card for the entry questionnaire. */
  sitePanel?: React.ReactNode;
}) {
  const { navigate, pendingHref } = useAdminNavigate();
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<QuestionnaireResponse | null>(null);
  // Fixed when the page loads, so "last 7 days" doesn't drift while it is open.
  const [now] = useState(() => Date.now());

  const answeredForms = forms.filter((f) => f.responses > 0);
  const emptyForms = forms.filter((f) => f.responses === 0);
  const responses = useMemo(() => report?.responses ?? [], [report]);
  const choiceQuestions = useMemo(
    () => (report?.questions ?? []).filter((q): q is QuestionnaireChoiceQuestion => q.kind === "choice"),
    [report],
  );
  const keyQuestions = choiceQuestions.slice(0, 2);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return responses.filter((r) => {
      for (const [fieldId, value] of Object.entries(picked)) {
        if (!(r.choices[fieldId] ?? []).includes(value)) return false;
      }
      if (!needle) return true;
      return [r.email, r.name, r.phone].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [responses, picked, search]);

  if (!report) {
    return (
      <div className="space-y-6">
      {sitePanel}
      <Card>
        <p className="py-8 text-center text-sm text-ink-soft">
          Още няма форми. Създай въпросник в{" "}
          <AdminNavLink href="/admin/forms" className="font-medium text-forest-700 underline">
            Форми
          </AdminNavLink>
          .
        </p>
      </Card>
      </div>
    );
  }

  const total = responses.length;
  const week = responses.filter((r) => now - new Date(r.submittedAt).getTime() <= 7 * DAY_MS).length;
  const month = responses.filter((r) => now - new Date(r.submittedAt).getTime() <= 30 * DAY_MS).length;
  const inList = responses.filter((r) => r.subscriberId).length;
  const visible = filtered.slice(0, shown);
  const labelOf = (fieldId: string, value: string) =>
    choiceQuestions.find((q) => q.id === fieldId)?.options.find((o) => o.value === value)?.label ?? value;
  const filtersActive = Object.keys(picked).length > 0 || search.trim() !== "";

  function pick(fieldId: string, value: string | null) {
    setPicked((prev) => {
      const next = { ...prev };
      if (value === null) delete next[fieldId];
      else next[fieldId] = value;
      return next;
    });
    setShown(PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      {/* One button per questionnaire */}
      <div className="flex flex-wrap items-center gap-2">
        {answeredForms.map((f) => {
          const href = `/admin/questionnaires?form=${encodeURIComponent(f.slug)}`;
          const active = f.id === report.form.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => !active && navigate(href)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "border-forest-600 bg-forest-600 text-cream"
                  : "border-ink/10 bg-white text-ink hover:border-forest-400",
                pendingHref === href && "opacity-70",
              )}
            >
              <FileText className="h-4 w-4" aria-hidden />
              {f.name}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  active ? "bg-white/20" : "bg-ink/5 text-ink-soft",
                )}
              >
                {f.responses}
              </span>
            </button>
          );
        })}
        {emptyForms.length > 0 && (
          <select
            value={emptyForms.some((f) => f.id === report.form.id) ? report.form.slug : ""}
            onChange={(e) => {
              if (e.target.value) navigate(`/admin/questionnaires?form=${encodeURIComponent(e.target.value)}`);
            }}
            className="h-11 rounded-2xl border border-dashed border-ink/20 bg-white px-3 text-sm text-ink-soft"
            aria-label="Форми без отговори"
          >
            <option value="">Без отговори още ({emptyForms.length})…</option>
            {emptyForms.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Попълнили" value={total} hint={report.form.enabled ? "формата е активна" : "формата е изключена"} />
        <Stat label="Последните 7 дни" value={week} />
        <Stat label="Последните 30 дни" value={month} />
        <Stat
          label="Последно попълнен"
          value={report.form.lastAt ? formatShortDate(report.form.lastAt) : "-"}
          hint={total > 0 ? `${inList} от ${total} са в списъка с абонати` : undefined}
        />
      </div>

      <Card
        title="Попълнили"
        action={
          <button
            type="button"
            onClick={() => void exportExcel(report, filtered)}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold hover:bg-ink/5 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden /> Excel ({filtered.length})
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Търси</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder="Име, имейл или телефон"
              className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20"
            />
          </label>
          <p className="text-sm text-ink-soft">
            Показани: <strong className="text-ink">{filtered.length}</strong> от {total}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setPicked({});
                setSearch("");
                setShown(PAGE_SIZE);
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-coral-700 hover:bg-coral-500/10"
            >
              <X className="h-3 w-3" /> Изчисти филтрите
            </button>
          )}
        </div>

        <DataTable empty={filtered.length === 0 ? "Няма попълнени за тези филтри." : undefined}>
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Дата</th>
                <th className="min-w-[14rem] px-4 py-3 font-semibold">Име и имейл</th>
                <th className="px-4 py-3 font-semibold">Статус</th>
                {keyQuestions.map((q) => (
                  <th key={q.id} className="max-w-[14rem] px-4 py-3 font-semibold">
                    <span className="line-clamp-2 normal-case tracking-normal" title={q.label}>
                      {q.label}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-ink/5 align-top last:border-0 hover:bg-cream/30">
                  <td className="w-32 whitespace-nowrap px-4 py-3 text-ink-soft tabular-nums">
                    {formatDateTime(r.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{r.name ?? "-"}</p>
                    <p className="break-all text-xs text-ink-soft">{r.email ?? "без имейл"}</p>
                    {r.phone && <p className="text-xs text-ink-soft">{r.phone}</p>}
                    {r.unsubscribed && (
                      <span className="mt-1 inline-block">
                        <Badge tone="warning">Отписан</Badge>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {r.crmStatus ? (
                      <StatusBadge name={r.crmStatus.name} color={r.crmStatus.color} />
                    ) : (
                      <span className="text-xs text-ink-soft">Без статус</span>
                    )}
                  </td>
                  {keyQuestions.map((q) => (
                    <td key={q.id} className="max-w-[14rem] px-4 py-3 text-ink">
                      {(r.choices[q.id] ?? []).length === 0 ? (
                        <span className="text-ink-soft">-</span>
                      ) : (
                        <span className="line-clamp-2">
                          {(r.choices[q.id] ?? []).map((v) => labelOf(q.id, v)).join(", ")}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOpen(r)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 text-xs font-semibold text-ink hover:bg-ink/5"
                      >
                        <FileText className="h-3.5 w-3.5" /> Отговори
                      </button>
                      {r.subscriberId && (
                        <AdminNavLink
                          href={`/admin/subscribers/${r.subscriberId}`}
                          className="inline-flex h-9 items-center gap-1 rounded-full bg-forest-600 px-3.5 text-xs font-semibold text-cream hover:bg-forest-700"
                        >
                          Профил <ChevronRight className="h-3.5 w-3.5" />
                        </AdminNavLink>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        {filtered.length > shown && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="inline-flex h-10 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
            >
              Покажи още ({filtered.length - shown})
            </button>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Какво отговориха">
          {report.questions.length === 0 ? (
            <p className="text-sm text-ink-soft">Формата няма въпроси с отговори за обобщаване.</p>
          ) : (
            <div className="-mt-2 grid gap-3 xl:grid-cols-2">
              {report.questions.map((q) =>
                q.kind === "choice" ? (
                  <ChoiceCard
                    key={q.id}
                    question={q}
                    total={total}
                    active={picked[q.id]}
                    onPick={(value) => pick(q.id, value)}
                  />
                ) : q.kind === "number" ? (
                  <div key={q.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                    <p className="text-sm font-semibold leading-snug text-ink">{q.label}</p>
                    <p className="mb-3 mt-0.5 text-xs text-ink-soft">{q.answered} от {total} отговорили</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        ["Средно", q.avg],
                        ["Най-малко", q.min],
                        ["Най-много", q.max],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl bg-cream/60 px-2 py-2.5">
                          <p className="text-[11px] text-ink-soft">{label}</p>
                          <p className="font-display text-xl font-semibold tabular-nums text-ink">
                            {value ?? "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={q.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                    <p className="text-sm font-semibold leading-snug text-ink">{q.label}</p>
                    <p className="mb-3 mt-0.5 text-xs text-ink-soft">{q.answered} от {total} отговорили</p>
                    {q.latest.length === 0 ? (
                      <p className="text-xs text-ink-soft">Още няма отговори.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {q.latest.map((a, i) => (
                          <li key={`${a.at}-${i}`} className="rounded-xl bg-cream/50 px-3 py-2 text-sm text-ink">
                            <p className="line-clamp-3 whitespace-pre-line">{a.value}</p>
                            <p className="mt-0.5 text-[11px] text-ink-soft">{formatShortDate(a.at)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </Card>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <ShareLinksPanel
            title="Страницата с въпросника"
            hint="Сложи линка в имейл, реклама или съобщение. Който попълни, влиза в групите, зададени във формата."
            links={links}
          />
          {Object.keys(picked).length > 0 && (
            <div className="rounded-2xl border border-forest-500/30 bg-forest-50/60 p-4">
              <p className="text-sm font-semibold text-forest-800">Показвам само хората с:</p>
              <ul className="mt-2 space-y-1.5">
                {Object.entries(picked).map(([fieldId, value]) => (
                  <li key={fieldId} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block text-xs text-ink-soft">
                        {choiceQuestions.find((q) => q.id === fieldId)?.label}
                      </span>
                      <span className="font-medium text-ink">{labelOf(fieldId, value)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => pick(fieldId, null)}
                      aria-label="Махни филтъра"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {sitePanel}

      {open && <AnswersDialog response={open} formName={report.form.name} onClose={() => setOpen(null)} />}
    </div>
  );
}
