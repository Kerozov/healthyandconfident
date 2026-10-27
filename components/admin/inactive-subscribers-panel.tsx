"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus } from "lucide-react";
import {
  getInactiveSubscribers,
  unsubscribeInactiveSubscribers,
  type InactiveSubscriber,
} from "@/app/(admin)/admin/actions";
import { Card, Field, Select } from "@/components/admin/fields";
import { Alert } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const MONTH_OPTIONS = [1, 2, 3, 4, 6, 9, 12, 18, 24];
const DEFAULT_MONTHS = 3;

export function InactiveSubscribersPanel() {
  const router = useRouter();
  const [months, setMonths] = useState(DEFAULT_MONTHS);
  const [rows, setRows] = useState<InactiveSubscriber[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (m: number) => {
    setLoading(true);
    setError(null);
    const res = await getInactiveSubscribers(m);
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      setRows([]);
      setSelected(new Set());
      return;
    }
    setRows(res.rows);
    // Everyone is picked by default — untick the ones to keep.
    setSelected(new Set(res.rows.map((r) => r.id)));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(months);
  }, [months, load]);

  const list = rows ?? [];
  const allSelected = list.length > 0 && selected.size === list.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(list.map((r) => r.id)));
  }

  function unsubscribeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Да отпишем ${ids.length} абоната, които не са отваряли имейл ${months} мес.? Няма да получават повече имейли.`,
      )
    ) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      const res = await unsubscribeInactiveSubscribers({ ids, months });
      if (!res.ok) {
        setError(res.message ?? "Грешка при отписване.");
      } else {
        setNotice(`Отписани: ${res.unsubscribed ?? 0}.`);
      }
      await load(months);
      router.refresh();
    });
  }

  const busy = loading || pending;

  return (
    <Card
      title="Неактивни абонати"
      action={
        <button
          type="button"
          onClick={unsubscribeSelected}
          disabled={busy || selected.size === 0}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserMinus className="h-4 w-4" aria-hidden />
          )}
          Отпиши избраните ({selected.size})
        </button>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Field label="Не са отваряли от">
            <Select
              value={String(months)}
              onChange={(e) => setMonths(Number(e.target.value))}
              disabled={busy}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "месец" : "месеца"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="pb-2 text-sm text-ink-soft">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Зареждане…
            </span>
          ) : (
            <>
              Намерени: <strong className="text-ink">{list.length}</strong>
            </>
          )}
        </p>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Показва абонати, които са получили поне един имейл през периода, но не са
        отворили нито един и не са кликнали линк. Хора, записали се по-скоро от
        началото на периода, не влизат. Отварянията се обновяват от worker-а - за
        най-пресни данни първо обнови статистиката в Автоматизации.
      </p>

      {error && (
        <Alert variant="warning" className="mt-4">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" className="mt-4">
          {notice}
        </Alert>
      )}

      {rows && list.length === 0 && !loading && !error && (
        <p className="mt-6 text-sm text-ink-soft">Няма неактивни абонати за този период.</p>
      )}

      {list.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                <th className="w-10 py-2 pr-2">
                  <input
                    type="checkbox"
                    aria-label="Избери всички"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    disabled={busy}
                    className="h-4 w-4 rounded border-ink/20"
                  />
                </th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Име</th>
                <th className="py-2 pr-4 text-center">Имейли за периода</th>
                <th className="py-2 pr-4">Последен имейл</th>
                <th className="py-2 pr-4">Последно отваряне</th>
                <th className="py-2 pr-4">Абонат от</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-ink/5">
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      aria-label={`Избери ${r.email}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      disabled={busy}
                      className="h-4 w-4 rounded border-ink/20"
                    />
                  </td>
                  <td className="py-3 pr-4 font-medium text-ink">{r.email}</td>
                  <td className="py-3 pr-4 text-ink-soft">{r.name || "-"}</td>
                  <td className="py-3 pr-4 text-center [font-variant-numeric:tabular-nums]">
                    {r.sent_count}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {r.last_sent_at ? formatDate(r.last_sent_at, "bg") : "-"}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {r.last_opened_at ? formatDate(r.last_opened_at, "bg") : "Никога"}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {formatDate(r.created_at, "bg")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
