"use client";

import { useState } from "react";
import type { PaymentStatsOverview } from "@/lib/admin/payment-stats";
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/admin/fields";
import { Alert, Badge, DataTable, TabList } from "@/components/admin/ui";
import {
  Meter,
  RankedBars,
  StatTile,
  TimeSeriesChart,
} from "@/components/admin/charts";

const STATUS_LABELS = {
  paid: "Платена",
  refunded: "Върната",
  failed: "Неуспешна",
} as const;

const KIND_LABELS = {
  product: "оферта",
  guide: "наръчник",
  unknown: "—",
} as const;

function shortDay(key: string): string {
  return `${Number(key.slice(8, 10))}.${key.slice(5, 7)}`;
}

function shortMonth(key: string): string {
  return `${key.slice(5, 7)}.${key.slice(2, 4)}`;
}

export function PaymentStatsDashboard({ stats }: { stats: PaymentStatsOverview }) {
  const [tab, setTab] = useState("overview");
  const { totals, trends, currency } = stats;

  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <div className="space-y-8">
      {stats.currencies.length > 1 && (
        <Alert variant="warning">
          Има плащания в няколко валути. Всички суми по-долу са само в{" "}
          <strong>{currency}</strong>. Останалите:{" "}
          {stats.currencies
            .slice(1)
            .map((c) => `${c.currency} (${formatNumber(c.orders)} поръчки)`)
            .join(", ")}
          .
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Оборот за периода"
          value={money(totals.grossCents)}
          delta={trends.gross}
          sub={`${money(stats.lifetime.grossCents)} за цялото време`}
        />
        <StatTile
          label="Поръчки"
          value={formatNumber(totals.orders)}
          delta={trends.orders}
          sub={`${formatNumber(totals.itemsSold)} продадени продукта`}
        />
        <StatTile
          label="Средна поръчка"
          value={money(totals.aovCents)}
          delta={trends.aov}
          sub="AOV — оборот / поръчки"
        />
        <StatTile
          label="Клиенти"
          value={formatNumber(totals.customers)}
          delta={trends.customers}
          sub={`${formatNumber(totals.newCustomers)} нови · ${formatNumber(totals.returningCustomers)} повторни`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Нетен оборот"
          value={money(totals.netCents)}
          sub="след връщания"
        />
        <StatTile
          label="Върнати суми"
          value={money(totals.refundedCents)}
          higherIsBetter={false}
          sub={`${formatNumber(totals.refundedOrders)} върнати поръчки`}
        />
        <StatTile
          label="Неуспешни плащания"
          value={formatNumber(totals.failedOrders)}
          higherIsBetter={false}
          sub="картата е отказана или преводът не е минал"
        />
        <StatTile
          label="Оборот на клиент"
          value={money(totals.revenuePerCustomerCents)}
          sub={`${formatPercent(stats.repeatCustomers.repeatRate)} купуват повторно`}
        />
      </div>

      <TabList
        aria-label="Изглед на плащанията"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Общо" },
          { id: "products", label: "Продукти", count: stats.products.length },
          { id: "orders", label: "Поръчки", count: stats.recentOrders.length },
          { id: "customers", label: "Клиенти", count: stats.topCustomers.length },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          <Card title="Оборот по дни">
            <TimeSeriesChart
              singleHue
              height={260}
              labels={stats.timeline.map((p) => shortDay(p.date))}
              series={[
                {
                  key: "revenue",
                  label: `Оборот (${currency})`,
                  values: stats.timeline.map((p) => p.grossCents / 100),
                },
              ]}
              formatValue={(v) => formatMoneyCompact(v * 100, currency)}
              emptyText="Няма плащания за периода."
            />
            {stats.period === 0 && (
              <p className="mt-3 text-xs text-ink-soft">
                Сумите горе са за цялото време; графиката показва последните 90 дни.
              </p>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Оборот по месеци">
              <TimeSeriesChart
                singleHue
                height={200}
                labels={stats.monthly.map((m) => shortMonth(m.month))}
                series={[
                  {
                    key: "monthly",
                    label: `Оборот (${currency})`,
                    values: stats.monthly.map((m) => m.grossCents / 100),
                  },
                ]}
                formatValue={(v) => formatMoneyCompact(v * 100, currency)}
                emptyText="Още няма история по месеци."
              />
              <p className="mt-3 text-xs text-ink-soft">
                Последните 12 месеца — независимо от избрания период.
              </p>
            </Card>

            <Card title="Фуния на плащането">
              <div className="space-y-4">
                <Meter
                  label="Започнати плащания"
                  value={stats.funnel.checkoutsStarted}
                  total={Math.max(stats.funnel.checkoutsStarted, 1)}
                />
                <Meter
                  label="Завършени поръчки"
                  value={stats.funnel.paidOrders}
                  total={Math.max(stats.funnel.checkoutsStarted, stats.funnel.paidOrders, 1)}
                />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-soft">Конверсия</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatPercent(stats.funnel.conversionRate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Изоставени</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(stats.funnel.abandoned)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-soft">
                Започнатите плащания се броят само когато купувачът е познат контакт
                (натиснал е бутон за плащане в сайта).
              </p>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Откъде идват платците">
              {stats.sources.length === 0 ? (
                <p className="text-sm text-ink-soft">Няма плащания за периода.</p>
              ) : (
                <RankedBars
                  data={stats.sources.map((s) => ({
                    id: s.source,
                    label: s.source,
                    value: s.revenueCents,
                    note: `${formatNumber(s.orders)} поръчки · ${formatNumber(s.customers)} клиенти`,
                  }))}
                  formatValue={(v) => money(v)}
                />
              )}
              <p className="mt-4 text-xs text-ink-soft">
                Източникът е този, с който човекът е влязъл в списъка (popup, форма,
                импорт, покупка).
              </p>
            </Card>

            <Card title="Път до покупка">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-soft">Средно дни</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {stats.daysToPurchase.average ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Медиана</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {stats.daysToPurchase.median ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Еднократни клиенти</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(stats.repeatCustomers.single)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Повторни клиенти</dt>
                  <dd className="mt-0.5 font-display text-2xl font-semibold text-ink">
                    {formatNumber(stats.repeatCustomers.repeat)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-soft">
                Дни от регистрацията до първата покупка (
                {formatNumber(stats.daysToPurchase.sample)} клиенти).
              </p>
            </Card>
          </div>

          {stats.problemOrders.length > 0 && (
            <Card title="Проблемни плащания">
              <OrdersTable rows={stats.problemOrders} currency={currency} />
            </Card>
          )}
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-6">
          <Card title="Оборот по продукт">
            {stats.products.length === 0 ? (
              <p className="text-sm text-ink-soft">Няма продажби за периода.</p>
            ) : (
              <RankedBars
                data={stats.products.map((p) => ({
                  id: p.id,
                  label: p.name,
                  value: p.revenueCents,
                  note: `${formatNumber(p.units)} продажби · ${formatNumber(p.customers)} клиенти · ${formatPercent(p.shareOfRevenue)} от оборота`,
                }))}
                formatValue={(v) => money(v)}
              />
            )}
          </Card>

          <DataTable
            empty={
              stats.products.length === 0 ? <p>Няма продажби за периода.</p> : undefined
            }
          >
            {stats.products.length > 0 && (
              <table className="w-full min-w-[44rem] text-sm [font-variant-numeric:tabular-nums]">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                    <th className="p-4 font-semibold">Продукт</th>
                    <th className="p-4 font-semibold">Продажби</th>
                    <th className="p-4 font-semibold">Оборот</th>
                    <th className="p-4 font-semibold">Клиенти</th>
                    <th className="p-4 font-semibold">Върнати</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.products.map((p) => (
                    <tr key={p.id} className="border-b border-ink/5 last:border-0">
                      <td className="p-4">
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-ink-soft">{KIND_LABELS[p.kind]}</p>
                      </td>
                      <td className="p-4">{formatNumber(p.units)}</td>
                      <td className="p-4 font-semibold">{money(p.revenueCents)}</td>
                      <td className="p-4">{formatNumber(p.customers)}</td>
                      <td className="p-4">
                        {p.refunds === 0 ? (
                          <span className="text-ink-soft">—</span>
                        ) : (
                          <Badge tone="warning">
                            {formatNumber(p.refunds)} · {money(p.refundedCents)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataTable>
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-6">
          <Card title="Последни поръчки">
            <OrdersTable rows={stats.recentOrders} currency={currency} />
          </Card>
          {stats.problemOrders.length > 0 && (
            <Card title="Върнати и неуспешни">
              <OrdersTable rows={stats.problemOrders} currency={currency} />
            </Card>
          )}
        </div>
      )}

      {tab === "customers" && (
        <DataTable
          empty={
            stats.topCustomers.length === 0 ? <p>Още няма клиенти.</p> : undefined
          }
        >
          {stats.topCustomers.length > 0 && (
            <table className="w-full min-w-[44rem] text-sm [font-variant-numeric:tabular-nums]">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-semibold">Клиент</th>
                  <th className="p-4 font-semibold">Поръчки</th>
                  <th className="p-4 font-semibold">Общо платил</th>
                  <th className="p-4 font-semibold">Първа</th>
                  <th className="p-4 font-semibold">Последна</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCustomers.map((c) => (
                  <tr key={c.email} className="border-b border-ink/5 last:border-0">
                    <td className="p-4">
                      <p className="font-medium text-ink">{c.name || c.email}</p>
                      {c.name && <p className="text-xs text-ink-soft">{c.email}</p>}
                    </td>
                    <td className="p-4">{formatNumber(c.orders)}</td>
                    <td className="p-4 font-semibold">{money(c.revenueCents)}</td>
                    <td className="p-4 text-ink-soft">{formatDate(c.firstOrderAt, "bg")}</td>
                    <td className="p-4 text-ink-soft">{formatDate(c.lastOrderAt, "bg")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      )}
    </div>
  );
}

function OrdersTable({
  rows,
  currency,
}: {
  rows: PaymentStatsOverview["recentOrders"];
  currency: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">Няма поръчки за периода.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm [font-variant-numeric:tabular-nums]">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
            <th className="py-2 pr-3 font-semibold">Клиент</th>
            <th className="py-2 pr-3 font-semibold">Продукти</th>
            <th className="py-2 pr-3 font-semibold">Сума</th>
            <th className="py-2 pr-3 font-semibold">Статус</th>
            <th className="py-2 font-semibold">Дата</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.sessionId} className="border-b border-ink/5 last:border-0">
              <td className="py-2.5 pr-3">
                <p className="font-medium text-ink">{order.name || order.email}</p>
                {order.name && <p className="text-xs text-ink-soft">{order.email}</p>}
              </td>
              <td className="py-2.5 pr-3 text-ink-soft">
                {order.items.filter(Boolean).join(", ") || "—"}
              </td>
              <td className="py-2.5 pr-3 font-semibold text-ink">
                {formatMoney(order.totalCents, order.currency || currency)}
              </td>
              <td className="py-2.5 pr-3">
                <Badge
                  tone={
                    order.status === "paid"
                      ? "success"
                      : order.status === "refunded"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {STATUS_LABELS[order.status]}
                </Badge>
              </td>
              <td className="py-2.5 text-ink-soft">
                {formatDate(order.purchasedAt, "bg")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
