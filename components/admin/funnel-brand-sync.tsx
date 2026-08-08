"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlugZap, RefreshCw } from "lucide-react";
import {
  syncFunnelBrandAction,
  testFunnelBrandAction,
} from "@/app/(admin)/admin/integration-actions";
import { Card } from "@/components/admin/fields";
import { AdminButton, Alert, Badge } from "@/components/admin/ui";
import type { FunnelBrandSyncStatus } from "@/lib/integrations/funnel-brand-sync";

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

export function FunnelBrandSync({ status }: { status: FunnelBrandSyncStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function run(full: boolean) {
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
      const res = await syncFunnelBrandAction({ full });
      setResult({ ok: res.ok, message: res.message });
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
          <AdminButton size="sm" onClick={() => run(false)} disabled={pending || !status.configured}>
            <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Синхронизирай
          </AdminButton>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-ink-soft">
        <p>
          Дърпа контактите, събрани през FunnelBrand, и ги слага в списъка с абонати. Всеки
          контакт идва с два етикета: сегмент по името на фунията (откъде идва) и{" "}
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
            onClick={() => run(true)}
            disabled={pending || !status.configured}
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
