import Link from "next/link";
import {
  Users,
  FileText,
  BarChart3,
  CreditCard,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { getDashboardStats, getDashboardHighlights } from "@/lib/admin/data";
import { formatMoney, formatNumber, formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader, Badge, DataTable } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, highlights] = await Promise.all([
    getDashboardStats(),
    getDashboardHighlights(),
  ]);

  const cards = [
    {
      label: "Посетители (30 дни)",
      value: formatNumber(highlights.visitors),
      sub: `${formatNumber(highlights.pageviews)} отворени страници`,
      icon: Eye,
      href: "/admin/visits",
    },
    {
      label: "Оборот (30 дни)",
      value: formatMoney(highlights.revenueCents, highlights.currency),
      sub: `${formatNumber(highlights.orders)} поръчки`,
      icon: CreditCard,
      href: "/admin/payments",
    },
    {
      label: "Изпратени имейли (30 дни)",
      value: formatNumber(highlights.emailsSent),
      sub: `${formatPercent(highlights.openRate)} отваряемост`,
      icon: BarChart3,
      href: "/admin/engagement",
    },
    {
      label: "Активни абонати",
      value: formatNumber(stats.activeSubscribers),
      sub: `${formatNumber(stats.totalSubscribers)} общо`,
      icon: Users,
      href: "/admin/subscribers",
    },
    {
      label: "Публикувани статии",
      value: formatNumber(stats.publishedPosts),
      sub: `${formatNumber(stats.totalPosts)} общо`,
      icon: FileText,
      href: "/admin/blog",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Табло"
        description="Бърз преглед на посещения, абонати, съдържание и кампании."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-2xl border border-ink/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <c.icon className="h-5 w-5" aria-hidden />
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-ink-soft/40 transition-colors group-hover:text-coral-500"
                aria-hidden
              />
            </div>
            <p className="mt-4 font-display text-4xl font-semibold text-ink">{c.value}</p>
            <p className="text-sm font-medium text-ink">{c.label}</p>
            <p className="text-xs text-ink-soft">{c.sub}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-ink">Скорошни кампании</h2>
          <Link
            href="/admin/campaigns"
            className="text-sm font-medium text-coral-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
          >
            Виж всички
          </Link>
        </div>

        <DataTable
          empty={
            stats.recentCampaigns.length === 0 ? (
              <p>Все още няма кампании.</p>
            ) : undefined
          }
        >
          {stats.recentCampaigns.length > 0 && (
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="p-4 font-semibold">Тема</th>
                  <th className="p-4 font-semibold">Сегмент</th>
                  <th className="p-4 font-semibold">Получатели</th>
                  <th className="p-4 font-semibold">Статус</th>
                  <th className="p-4 font-semibold">Дата</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-ink/5 last:border-0">
                    <td className="p-4 font-medium text-ink">{c.subject}</td>
                    <td className="p-4 text-ink-soft">{c.segment_tag}</td>
                    <td className="p-4 text-ink-soft">{c.recipients_count}</td>
                    <td className="p-4">
                      <Badge tone="success">{c.status}</Badge>
                    </td>
                    <td className="p-4 text-ink-soft">{formatDate(c.created_at, "bg")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTable>
      </section>
    </div>
  );
}
