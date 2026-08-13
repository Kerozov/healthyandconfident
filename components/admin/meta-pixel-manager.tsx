"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, ExternalLink, Megaphone } from "lucide-react";
import type { MetaPixelAdminData } from "@/lib/admin/meta-data";
import { saveMetaPixelConfig, sendMetaTestEvent } from "@/app/(admin)/admin/actions";
import { formatMoney, formatNumber } from "@/lib/money";
import { formatScheduledAt } from "@/lib/datetime";
import { Card, Field, Input, Textarea } from "@/components/admin/fields";
import { AdminButton, Alert, Badge, DataTable } from "@/components/admin/ui";

const EVENT_NOTES: Record<string, string> = {
  PageView: "Всяко отваряне на страница в сайта.",
  ViewContent: "Отваряне на страница на програма.",
  InitiateCheckout: "Натиснат бутон за плащане.",
  Lead: "Записан имейл през форма или popup.",
  CompleteRegistration: "Попълнена въпросник-форма.",
  Purchase: "Потвърдено плащане от Stripe.",
  AddToCart: "Добавена оферта.",
  Subscribe: "Абонамент.",
  Contact: "Заявка за контакт.",
};

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 px-4 py-3 transition-colors hover:bg-ink/[0.02] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-forest-300 text-forest-600 focus:ring-forest-400"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export function MetaPixelManager({ data }: { data: MetaPixelAdminData }) {
  const [form, setForm] = useState({
    enabled: data.config.enabled,
    pixel_id: data.config.pixel_id,
    access_token: data.config.access_token,
    test_event_code: data.config.test_event_code,
    capi_enabled: data.config.capi_enabled,
    track_page_view: data.config.track_page_view,
    track_view_content: data.config.track_view_content,
    track_lead: data.config.track_lead,
    track_checkout: data.config.track_checkout,
    track_purchase: data.config.track_purchase,
    log_events: data.config.log_events,
    domain_verification: data.config.domain_verification ?? "",
    additional_pixel_ids: data.config.additional_pixel_ids ?? "",
    ad_account_id: data.config.ad_account_id ?? "",
    catalog_id: data.config.catalog_id ?? "",
    notes: data.config.notes ?? "",
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveMetaPixelConfig(form);
      setMessage({ ok: result.ok, text: result.message ?? "" });
    });
  }

  function test() {
    startTransition(async () => {
      const result = await sendMetaTestEvent();
      setMessage({ ok: result.ok, text: result.message ?? "" });
    });
  }

  const totalSent = data.summary.reduce((sum, row) => sum + row.sent, 0);
  const totalFailed = data.summary.reduce((sum, row) => sum + row.failed, 0);
  const purchaseValue =
    data.summary.find((row) => row.eventName === "Purchase")?.valueCents ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          ok={data.pixelActive}
          title="Пиксел в сайта"
          okText="Активен — зарежда се на всички страници"
          badText="Изключен — липсва Pixel ID или е спрян"
        />
        <StatusCard
          ok={data.capiActive}
          title="Conversions API"
          okText="Активен — събитията се пращат и от сървъра"
          badText="Изключен — липсва Access token"
        />
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
            Събития (30 дни)
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {formatNumber(totalSent)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {formatNumber(totalFailed)} неуспешни · {formatNumber(data.last7.sent)} за
            7 дни
          </p>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
            Отчетени продажби
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {formatMoney(purchaseValue, "GBP")}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Стойност на Purchase събитията към Meta (30 дни)
          </p>
        </div>
      </div>

      {message && (
        <Alert variant={message.ok ? "success" : "warning"}>{message.text}</Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Връзка с Meta">
          <div className="space-y-4">
            <Toggle
              label="Включи Meta пиксела"
              hint="Без това нищо не се изпраща — нито от браузъра, нито от сървъра."
              checked={form.enabled}
              onChange={(v) => set("enabled", v)}
            />

            <Field
              label="Pixel ID"
              hint={
                data.envPixelId && !form.pixel_id
                  ? `Използва се от env: ${data.envPixelId}`
                  : "Events Manager → Data sources → срещу името на пиксела."
              }
              htmlFor="meta-pixel-id"
            >
              <Input
                id="meta-pixel-id"
                value={form.pixel_id}
                onChange={(e) => set("pixel_id", e.target.value)}
                placeholder="1234567890123456"
                inputMode="numeric"
              />
            </Field>

            <Field
              label="Conversions API access token"
              hint={
                data.envTokenPresent && !form.access_token
                  ? "Взема се от env променливата META_CONVERSIONS_API_TOKEN."
                  : "Events Manager → Settings → Conversions API → Generate access token."
              }
              htmlFor="meta-token"
            >
              <Input
                id="meta-token"
                type="password"
                value={form.access_token}
                onChange={(e) => set("access_token", e.target.value)}
                placeholder="EAAG…"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Test event code (по избор)"
              hint="Само докато тестваш. Остави празно за реални данни."
              htmlFor="meta-test-code"
            >
              <Input
                id="meta-test-code"
                value={form.test_event_code}
                onChange={(e) => set("test_event_code", e.target.value)}
                placeholder="TEST12345"
              />
            </Field>

            <Toggle
              label="Изпращай и от сървъра (Conversions API)"
              hint="Записва продажбите дори когато браузърът блокира пиксела. Събитията се дублират с еднакво id, така че Meta ги брои веднъж."
              checked={form.capi_enabled}
              onChange={(v) => set("capi_enabled", v)}
            />

            <Toggle
              label="Записвай журнал на събитията"
              hint="Нужен е за таблицата по-долу. Изключи го само ако базата расте прекалено."
              checked={form.log_events}
              onChange={(v) => set("log_events", v)}
            />
          </div>
        </Card>

        <Card title="Кои събития да се следят">
          <div className="space-y-3">
            <Toggle
              label="PageView — преглед на страница"
              hint="Основата за ретаргетинг аудитории."
              checked={form.track_page_view}
              onChange={(v) => set("track_page_view", v)}
            />
            <Toggle
              label="ViewContent — преглед на програма"
              checked={form.track_view_content}
              onChange={(v) => set("track_view_content", v)}
            />
            <Toggle
              label="Lead — записан имейл"
              hint="Popup, лийд форма и въпросници."
              checked={form.track_lead}
              onChange={(v) => set("track_lead", v)}
            />
            <Toggle
              label="InitiateCheckout — започнато плащане"
              checked={form.track_checkout}
              onChange={(v) => set("track_checkout", v)}
            />
            <Toggle
              label="Purchase — потвърдено плащане"
              hint="Изпраща се от Stripe webhook-а с точната сума."
              checked={form.track_purchase}
              onChange={(v) => set("track_purchase", v)}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <AdminButton onClick={save} disabled={pending}>
              {pending ? "Запазване…" : "Запази"}
            </AdminButton>
            <AdminButton variant="secondary" onClick={test} disabled={pending}>
              Изпрати тестово събитие
            </AdminButton>
            <a
              href="https://business.facebook.com/events_manager2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 hover:underline"
            >
              Events Manager
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-soft">
            Личните данни (имейл, име, телефон) се хешират с SHA-256, преди да
            напуснат сайта — Meta никога не получава чист имейл.
          </p>
        </Card>
      </div>

      <Card
        title="Мета реклами — тракинг данни"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            <Megaphone className="h-4 w-4" aria-hidden />
            Всичко от Business Manager се слага тук
          </span>
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Field
              label="Код за верификация на домейна"
              hint="Business Manager → Brand safety → Domains → Meta-tag verification. Копирай само стойността на content=„…“ — сайтът сам слага мета тага във всяка страница."
              htmlFor="meta-domain-verification"
            >
              <Input
                id="meta-domain-verification"
                value={form.domain_verification}
                onChange={(e) => set("domain_verification", e.target.value)}
                placeholder="abc123def456…"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Допълнителни Pixel ID-та"
              hint="За втори акаунт или агенция. Разделяй със запетая. Събитията отиват и до тях — и от браузъра, и от сървъра. Access token-ът трябва да има права върху всеки от тях."
              htmlFor="meta-extra-pixels"
            >
              <Input
                id="meta-extra-pixels"
                value={form.additional_pixel_ids}
                onChange={(e) => set("additional_pixel_ids", e.target.value)}
                placeholder="1234567890123456, 6543210987654321"
                autoComplete="off"
              />
            </Field>
          </div>

          <div className="space-y-5">
            <Field
              label="Рекламен акаунт (Ad account ID)"
              hint="Само за справка и за бутона към Ads Manager. Формат act_1234567890."
              htmlFor="meta-ad-account"
            >
              <Input
                id="meta-ad-account"
                value={form.ad_account_id}
                onChange={(e) => set("ad_account_id", e.target.value)}
                placeholder="act_1234567890"
                autoComplete="off"
              />
            </Field>

            <Field
              label="Каталог (Catalog ID)"
              hint="Ако пускаш реклами с продуктов каталог. Само за справка."
              htmlFor="meta-catalog"
            >
              <Input
                id="meta-catalog"
                value={form.catalog_id}
                onChange={(e) => set("catalog_id", e.target.value)}
                placeholder="1234567890"
                autoComplete="off"
              />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field
              label="Бележки"
              hint="Място за всичко останало — кампании, UTM-и, кой какво е сменил и кога."
              htmlFor="meta-notes"
            >
              <Textarea
                id="meta-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Напр. пиксел на агенцията добавен на 12.03; кампания „Лятна програма“ води към /bg/programs/summer-programme"
              />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <AdminButton onClick={save} disabled={pending}>
            {pending ? "Запазване…" : "Запази"}
          </AdminButton>
          {form.ad_account_id.trim() && (
            <a
              href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(
                form.ad_account_id.trim().replace(/^act_/, ""),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 hover:underline"
            >
              Ads Manager
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
          <a
            href="https://business.facebook.com/settings/owned-domains"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-coral-600 hover:underline"
          >
            Верификация на домейн
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </Card>

      <Card title="Събития за последните 30 дни">
        {data.summary.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Още няма записани събития. Включи пиксела, запази и отвори сайта — или
            натисни „Изпрати тестово събитие“.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/70">
                  <th className="py-2 pr-3 font-semibold">Събитие</th>
                  <th className="py-2 pr-3 font-semibold">Изпратени</th>
                  <th className="py-2 pr-3 font-semibold">Грешки</th>
                  <th className="py-2 pr-3 font-semibold">От браузър</th>
                  <th className="py-2 font-semibold">От сървър</th>
                </tr>
              </thead>
              <tbody>
                {data.summary.map((row) => (
                  <tr key={row.eventName} className="border-b border-ink/5 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-ink">{row.eventName}</p>
                      {EVENT_NOTES[row.eventName] && (
                        <p className="text-xs text-ink-soft">
                          {EVENT_NOTES[row.eventName]}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{formatNumber(row.sent)}</td>
                    <td className="py-2.5 pr-3">
                      {row.failed === 0 ? (
                        <span className="text-ink-soft">—</span>
                      ) : (
                        <Badge tone="warning">{formatNumber(row.failed)}</Badge>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {formatNumber(row.browser)}
                    </td>
                    <td className="py-2.5 text-ink-soft">{formatNumber(row.server)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DataTable
        empty={data.recent.length === 0 ? <p>Журналът е празен.</p> : undefined}
      >
        {data.recent.length > 0 && (
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="p-4 font-semibold">Събитие</th>
                <th className="p-4 font-semibold">Източник</th>
                <th className="p-4 font-semibold">Имейл</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4 font-semibold">Кога</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.id} className="border-b border-ink/5 last:border-0">
                  <td className="p-4">
                    <p className="font-medium text-ink">{row.event_name}</p>
                    {row.value_cents != null && (
                      <p className="text-xs text-ink-soft">
                        {formatMoney(row.value_cents, row.currency ?? "GBP")}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-ink-soft">
                    {row.source === "browser" ? "Браузър" : "Сървър"}
                  </td>
                  <td className="p-4 text-ink-soft">{row.email ?? "—"}</td>
                  <td className="p-4">
                    {row.status === "sent" ? (
                      <Badge tone="success">Изпратено</Badge>
                    ) : row.status === "failed" ? (
                      <Badge tone="warning" className="max-w-[18rem] truncate">
                        {row.error ?? "Грешка"}
                      </Badge>
                    ) : (
                      <Badge>Пропуснато</Badge>
                    )}
                  </td>
                  <td className="p-4 text-ink-soft">
                    {formatScheduledAt(row.created_at, "bg")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DataTable>
    </div>
  );
}

function StatusCard({
  ok,
  title,
  okText,
  badText,
}: {
  ok: boolean;
  title: string;
  okText: string;
  badText: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
        {title}
      </p>
      <p className="mt-2 flex items-center gap-2 font-display text-xl font-semibold text-ink">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-forest-600" aria-hidden />
        ) : (
          <AlertTriangle className="h-5 w-5 text-coral-600" aria-hidden />
        )}
        {ok ? "Работи" : "Спрян"}
      </p>
      <p className="mt-1 text-xs text-ink-soft">{ok ? okText : badText}</p>
    </div>
  );
}
