"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlugZap, RefreshCw } from "lucide-react";
import {
  listFunnelBrandFunnelsAction,
  syncFunnelBrandAction,
  testFunnelBrandAction,
} from "@/app/(admin)/admin/integration-actions";
import { Card, Input, Select } from "@/components/admin/fields";
import { AdminButton, Alert, Badge } from "@/components/admin/ui";
import type {
  FunnelBrandFunnelOption,
  FunnelBrandSyncStatus,
  FunnelSegmentChoice,
  FunnelSegmentRouting,
} from "@/lib/integrations/funnel-brand-sync";
import type { Segment } from "@/lib/supabase/types";

function formatDate(value: string | null): string {
  if (!value) return "никога";
  return new Date(value).toLocaleString("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Value of the mode picker: `same`, `custom`, or `existing:<key>`. */
function choiceValue(choice: FunnelSegmentChoice): string {
  return choice.mode === "existing" ? `existing:${choice.key}` : choice.mode;
}

function FunnelRoutingRow({
  funnel,
  choice,
  segments,
  disabled,
  onChange,
}: {
  funnel: FunnelBrandFunnelOption;
  choice: FunnelSegmentChoice;
  segments: Segment[];
  disabled: boolean;
  onChange: (choice: FunnelSegmentChoice) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-ink/10 p-3 sm:grid-cols-[1fr_1.4fr] sm:items-start">
      <div>
        <p className="font-medium text-ink">{funnel.name}</p>
        <p className="text-xs">{funnel.contacts} контакта</p>
      </div>
      <div className="space-y-2">
        <Select
          value={choiceValue(choice)}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "same") onChange({ mode: "same" });
            else if (value === "custom") onChange({ mode: "custom", name: "" });
            else onChange({ mode: "existing", key: value.slice("existing:".length) });
          }}
        >
          <option value="same">Нов сегмент със същото име („{funnel.name}“)</option>
          <option value="custom">Нов сегмент с друго име…</option>
          {segments.length > 0 && (
            <optgroup label="Съществуващ сегмент">
              {segments.map((segment) => (
                <option key={segment.key} value={`existing:${segment.key}`}>
                  {segment.name}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
        {choice.mode === "custom" && (
          <Input
            value={choice.name}
            disabled={disabled}
            placeholder="Име на новия сегмент"
            onChange={(e) => onChange({ mode: "custom", name: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

export function FunnelBrandSync({
  status,
  segments,
}: {
  status: FunnelBrandSyncStatus;
  segments: Segment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  /** Set while the segment picker is open: the funnels behind the key and the mode. */
  const [picker, setPicker] = useState<{
    full: boolean;
    funnels: FunnelBrandFunnelOption[];
  } | null>(null);
  const [routing, setRouting] = useState<FunnelSegmentRouting>(status.routing);

  const segmentKeys = new Set(segments.map((s) => s.key));

  function choiceFor(funnel: FunnelBrandFunnelOption): FunnelSegmentChoice {
    const choice = routing[funnel.segment];
    // A segment deleted since the last sync falls back to the default.
    if (!choice || (choice.mode === "existing" && !segmentKeys.has(choice.key))) {
      return { mode: "same" };
    }
    return choice;
  }

  function open(full: boolean) {
    if (
      full &&
      !confirm(
        "Пълна синхронизация чете всички контакти от FunnelBrand отначало.\n\nПродължаване?",
      )
    ) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const res = await listFunnelBrandFunnelsAction();
      if (!res.ok) {
        setResult(res);
        return;
      }
      setPicker({ full, funnels: res.funnels });
    });
  }

  function run() {
    if (!picker) return;

    const chosen: FunnelSegmentRouting = { ...routing };
    for (const funnel of picker.funnels) {
      const choice = choiceFor(funnel);
      if (choice.mode === "custom" && !choice.name.trim()) {
        setResult({ ok: false, message: `Въведи име на сегмента за „${funnel.name}“.` });
        return;
      }
      chosen[funnel.segment] = choice;
    }

    const full = picker.full;
    setResult(null);
    startTransition(async () => {
      const res = await syncFunnelBrandAction({ full, routing: chosen });
      setResult({ ok: res.ok, message: res.message });
      setPicker(null);
      router.refresh();
    });
  }

  function test() {
    setResult(null);
    startTransition(async () => {
      setResult(await testFunnelBrandAction());
    });
  }

  return (
    <Card
      title="FunnelBrand — синхронизация на контакти"
      action={
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="secondary" size="sm" onClick={test} disabled={pending}>
            <PlugZap className="h-4 w-4" />
            Провери връзката
          </AdminButton>
          <AdminButton
            size="sm"
            onClick={() => open(false)}
            disabled={pending || !status.configured || picker !== null}
          >
            <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Синхронизирай
          </AdminButton>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-ink-soft">
        <p>
          Дърпа контактите, събрани през FunnelBrand, и ги слага в списъка с абонати. Всеки
          контакт идва с два етикета: група по името на фунията (откъде идва) и{" "}
          <Badge>funnel-brand</Badge> (с кой софтуер е събран). Автоматизации не се пускат —
          за да не тръгнат имейли към всички наведнъж.
        </p>

        {!status.configured && (
          <Alert variant="warning">
            Липсва <code>FUNNEL_BRAND_API_KEY</code>. Създай ключ в FunnelBrand → фунията →
            Контакти → Синхронизация и го добави в env на сайта заедно с{" "}
            <code>FUNNEL_BRAND_API_URL</code>.
          </Alert>
        )}

        <dl className="grid gap-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Последно</dt>
            <dd className="text-ink">{formatDate(status.lastRunAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Нови</dt>
            <dd className="text-ink">{status.lastCreated}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Обновени</dt>
            <dd className="text-ink">{status.lastUpdated}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Пропуснати</dt>
            <dd className="text-ink">{status.lastSkipped}</dd>
          </div>
        </dl>

        {picker && (
          <div className="space-y-3 rounded-2xl border border-forest-400/30 bg-forest-50/40 p-4">
            <div>
              <p className="font-medium text-ink">
                {picker.full ? "Пълна синхронизация" : "Синхронизация"} — в кой сегмент отиват
                контактите?
              </p>
              <p className="text-xs">
                Изборът важи за контактите, които се дърпат сега, и се запомня за следващия път.
                Вече внесените контакти не се местят — за тях пусни пълна синхронизация.
              </p>
            </div>

            {picker.funnels.length === 0 ? (
              <p>Ключът няма достъп до нито една фуния.</p>
            ) : (
              picker.funnels.map((funnel) => (
                <FunnelRoutingRow
                  key={funnel.id}
                  funnel={funnel}
                  choice={choiceFor(funnel)}
                  segments={segments}
                  disabled={pending}
                  onChange={(choice) =>
                    setRouting((prev) => ({ ...prev, [funnel.segment]: choice }))
                  }
                />
              ))
            )}

            <div className="flex flex-wrap gap-2">
              <AdminButton size="sm" onClick={run} disabled={pending}>
                <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Започни синхронизацията
              </AdminButton>
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => setPicker(null)}
                disabled={pending}
              >
                Отказ
              </AdminButton>
            </div>
          </div>
        )}

        {status.lastError && (
          <Alert variant="warning">Последна грешка: {status.lastError}</Alert>
        )}

        {result && (
          <Alert variant={result.ok ? "success" : "warning"}>{result.message}</Alert>
        )}

        <p className="text-xs">
          Синхронизацията взима само новото от последния път.{" "}
          <button
            type="button"
            onClick={() => open(true)}
            disabled={pending || !status.configured || picker !== null}
            className="underline underline-offset-2 disabled:opacity-50"
          >
            Пълна синхронизация
          </button>{" "}
          чете целия списък отначало — полезно, ако нещо е пропуснато.
        </p>
      </div>
    </Card>
  );
}
