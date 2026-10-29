"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Search } from "lucide-react";
import type {
  FreeMenuEmailState,
  FreeMenuInterest,
  FreeMenuReport,
  FreeMenuSignup,
} from "@/lib/admin/free-menu";
import type { ShareLink } from "@/lib/site/share-links";
import { HEALTH_SEGMENT_LABELS_BG } from "@/lib/site/health-tags";
import { formatAdminDateTime } from "@/lib/admin/format-time";
import { Card, Field, Input, Select } from "@/components/admin/fields";
import { Badge, DataTable } from "@/components/admin/ui";
import { ShareLinksPanel } from "@/components/admin/share-links";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type AnswerFilter = "all" | FreeMenuInterest | "none";
type PeriodFilter = "all" | "7" | "30" | "90";

const ANSWERS: { key: FreeMenuInterest; label: string; bar: string }[] = [
  { key: "insulin-resistance", label: HEALTH_SEGMENT_LABELS_BG["insulin-resistance"], bar: "bg-forest-500" },
  { key: "diabetes", label: HEALTH_SEGMENT_LABELS_BG.diabetes, bar: "bg-gold-500" },
  { key: "weight-loss", label: HEALTH_SEGMENT_LABELS_BG["weight-loss"], bar: "bg-coral-500" },
];

const EMAIL_STATE: Record<
  FreeMenuEmailState,
  { label: string; tone: "neutral" | "success" | "warning" | "forest" }
> = {
  clicked: { label: "Отворен, кликнат", tone: "success" },
  opened: { label: "Отворен", tone: "success" },
  sent: { label: "Изпратен", tone: "forest" },
  scheduled: { label: "Насрочен", tone: "neutral" },
  bounced: { label: "Върнат - грешен имейл", tone: "warning" },
  failed: { label: "Грешка при изпращане", tone: "warning" },
  skipped: { label: "Пропуснат", tone: "neutral" },
  none: { label: "Не е изпращан", tone: "warning" },
};

function answerLabel(s: FreeMenuSignup): string {
  if (s.interests.length === 0) return "Без отговор";
  return s.interests.map((key) => HEALTH_SEGMENT_LABELS_BG[key]).join(", ");
}

/** Only a real web address becomes a link - the field is free text typed by a visitor. */
function facebookHref(value: string): string | null {
  const v = value.trim();
  if (/^https?:\/\/\S+$/i.test(v)) return v;
  if (/^(www\.|m\.)?(facebook|fb)\.com\/\S+$/i.test(v)) return `https://${v}`;
  return null;
}

function matchesSearch(s: FreeMenuSignup, needle: string): boolean {
  if (!needle) return true;
  return [s.email, s.name, s.facebook, s.phone].some((v) =>
    v?.toLowerCase().includes(needle),
  );
}

async function exportExcel(rows: FreeMenuSignup[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(
    rows.map((s) => ({
      "Дата": formatAdminDateTime(s.createdAt),
      "Име": s.name ?? "",
      "Имейл": s.email,
      "Facebook": s.facebook ?? "",
      "Телефон": s.phone ?? "",
      "С какво можем да помогнем": answerLabel(s),
      "Откъде": s.sourceLabel,
      "Език": s.locale.toUpperCase(),
      "Имейл с менюто": EMAIL_STATE[s.menuEmail.state].label,
      "Отписан": s.unsubscribed ? "да" : "",
    })),
  );
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Безплатно меню");
  XLSX.writeFile(book, `bezplatno-menu-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function FreeMenuSignups({
  report,
  links,
}: {
  report: FreeMenuReport;
  links: ShareLink[];
}) {
  const { signups, menuEmailNames } = report;
  const [answer, setAnswer] = useState<AnswerFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  // Fixed when the page loads, so "last 7 days" doesn't drift while it is open.
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    const since = (days: number) =>
      signups.filter((s) => now - new Date(s.createdAt).getTime() <= days * DAY_MS).length;
    const mailed = signups.filter((s) =>
      ["sent", "opened", "clicked"].includes(s.menuEmail.state),
    ).length;
    const opened = signups.filter((s) =>
      ["opened", "clicked"].includes(s.menuEmail.state),
    ).length;
    const byAnswer = new Map<AnswerFilter, number>();
    for (const s of signups) {
      if (s.interests.length === 0) byAnswer.set("none", (byAnswer.get("none") ?? 0) + 1);
      for (const key of s.interests) byAnswer.set(key, (byAnswer.get(key) ?? 0) + 1);
    }
    return { week: since(7), month: since(30), mailed, opened, byAnswer };
  }, [signups, now]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const days = period === "all" ? null : Number(period);
    return signups.filter((s) => {
      if (days !== null && now - new Date(s.createdAt).getTime() > days * DAY_MS) return false;
      if (answer === "none" && s.interests.length > 0) return false;
      if (answer !== "all" && answer !== "none" && !s.interests.includes(answer)) return false;
      return matchesSearch(s, needle);
    });
  }, [signups, answer, period, search, now]);

  const visible = filtered.slice(0, shown);
  const total = signups.length;
  const openRate = stats.mailed > 0 ? Math.round((stats.opened / stats.mailed) * 100) : null;
  const answerRows = [
    ...ANSWERS,
    { key: "none" as const, label: "Без отговор", bar: "bg-ink/25" },
  ].filter((row) => row.key !== "none" || (stats.byAnswer.get("none") ?? 0) > 0);

  function resetPaging<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setShown(PAGE_SIZE);
    };
  }
  const chooseAnswer = resetPaging(setAnswer);
  const choosePeriod = resetPaging(setPeriod);
  const chooseSearch = resetPaging(setSearch);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Поискали менюто" value={total} />
        <Stat label="Последните 7 дни" value={stats.week} />
        <Stat label="Последните 30 дни" value={stats.month} />
        <Stat
          label="Отворили имейла с менюто"
          value={openRate === null ? "-" : `${openRate}%`}
          hint={`${stats.opened} от ${stats.mailed} изпратени`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="С какво можем да ти помогнем?">
          <p className="-mt-3 mb-4 text-xs text-ink-soft">
            Отговорите във формата. Кликни отговор, за да видиш само тези хора.
          </p>
          <ul className="space-y-2">
            {answerRows.map((row) => {
              const count = stats.byAnswer.get(row.key) ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const active = answer === row.key;
              return (
                <li key={row.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseAnswer(active ? "all" : row.key)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35",
                      active
                        ? "border-forest-500/50 bg-forest-50"
                        : "border-ink/10 hover:border-forest-500/30 hover:bg-cream-2/40",
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-ink">{row.label}</span>
                      <span className="shrink-0 tabular-nums text-ink-soft">
                        <strong className="text-ink">{count}</strong> · {pct}%
                      </span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink/5">
                      <span
                        className={cn("block h-full rounded-full", row.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <ShareLinksPanel
          title="Страницата с формата"
          hint="Самостоятелна страница със същата форма като бутона на началната страница. Сложи линка в реклама, в био-то или в съобщение - записаните получават същите имейли."
          links={links}
        />
      </div>

      <Card
        title="Заявки"
        action={
          <button
            type="button"
            onClick={() => void exportExcel(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-semibold hover:bg-ink/5 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden /> Excel ({filtered.length})
          </button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Field label="Търси" htmlFor="free-menu-search">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
                  aria-hidden
                />
                <Input
                  id="free-menu-search"
                  type="search"
                  value={search}
                  onChange={(e) => chooseSearch(e.target.value)}
                  placeholder="Име, имейл, Facebook или телефон"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>
          <div className="w-44">
            <Field label="Период" htmlFor="free-menu-period">
              <Select id="free-menu-period" value={period} onChange={(e) => choosePeriod(e.target.value as PeriodFilter)}>
                <option value="all">Всички</option>
                <option value="7">Последните 7 дни</option>
                <option value="30">Последните 30 дни</option>
                <option value="90">Последните 90 дни</option>
              </Select>
            </Field>
          </div>
          <div className="w-60">
            <Field label="Отговор" htmlFor="free-menu-answer">
              <Select id="free-menu-answer" value={answer} onChange={(e) => chooseAnswer(e.target.value as AnswerFilter)}>
                <option value="all">Всички отговори</option>
                {ANSWERS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
                <option value="none">Без отговор</option>
              </Select>
            </Field>
          </div>
          <p className="pb-2.5 text-sm text-ink-soft">
            Показани: <strong className="text-ink">{filtered.length}</strong> от {total}
          </p>
        </div>

        <div className="mt-5">
          <DataTable empty={filtered.length === 0 ? "Няма заявки за тези филтри." : undefined}>
            <table className="w-full min-w-[56rem] text-sm">
              <thead>
                <tr className="whitespace-nowrap border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                  <th className="px-4 py-3 font-semibold">Дата</th>
                  <th className="min-w-[14rem] px-4 py-3 font-semibold">Име и имейл</th>
                  <th className="px-4 py-3 font-semibold">Facebook</th>
                  <th className="px-4 py-3 font-semibold">С какво да помогнем</th>
                  <th className="px-4 py-3 font-semibold">Откъде</th>
                  <th className="px-4 py-3 font-semibold">Имейл с менюто</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => {
                  const fb = s.facebook ? facebookHref(s.facebook) : null;
                  const state = EMAIL_STATE[s.menuEmail.state];
                  return (
                    <tr key={s.id} className="border-b border-ink/5 align-top last:border-0">
                      <td className="w-32 px-4 py-3 text-ink-soft">
                        {formatAdminDateTime(s.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{s.name ?? "-"}</p>
                        <p className="break-all text-xs text-ink-soft">{s.email}</p>
                        {s.phone && <p className="text-xs text-ink-soft">{s.phone}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {s.locale === "en" && <Badge>EN</Badge>}
                          {s.unsubscribed && <Badge tone="warning">Отписан</Badge>}
                        </div>
                      </td>
                      <td className="max-w-[14rem] px-4 py-3">
                        {!s.facebook ? (
                          <span className="text-ink-soft">-</span>
                        ) : fb ? (
                          <a
                            href={fb}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex max-w-full items-center gap-1 text-forest-700 hover:underline"
                          >
                            <span className="truncate">{s.facebook}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          </a>
                        ) : (
                          <span className="break-words text-ink">{s.facebook}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {s.interests.length === 0 ? (
                          <span className="text-ink-soft">Без отговор</span>
                        ) : (
                          answerLabel(s)
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{s.sourceLabel}</td>
                      <td className="px-4 py-3">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        {s.menuEmail.at && (
                          <p className="mt-1 whitespace-nowrap text-xs text-ink-soft">
                            {formatAdminDateTime(s.menuEmail.at)}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        </div>

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

        <p className="mt-5 text-xs leading-relaxed text-ink-soft">
          Тук са всички в сегмента „free-menu“ - записаните от бутона и popup-а на
          сайта, от тази страница или добавени ръчно. Датата е кога човекът е влязъл
          в списъка: ако вече е бил абонат, преди да поиска менюто, датата е по-ранна.
          {menuEmailNames.length > 0 ? (
            <>
              {" "}
              „Имейл с менюто“ е статусът на автоматизацията{" "}
              {menuEmailNames.map((n) => `„${n}“`).join(", ")}. Отварянията идват от
              worker-а - за най-пресни данни обнови статистиката в Автоматизации.
            </>
          ) : (
            <> Не е намерена автоматизация, която да изпраща менюто при влизане в „free-menu“.</>
          )}
        </p>
      </Card>
    </div>
  );
}
