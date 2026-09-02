import { DashboardStatCard } from "@/components/admin/dashboard-stat-card";
import { getDashboardStats, getDashboardHighlights } from "@/lib/admin/data";
import {
  Users,
  FileText,
  BarChart3,
  CreditCard,
  Eye,
} from "lucide-react";
import { formatMoney, formatNumber, formatPercent } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { PageHeader, Badge, DataTable, Alert } from "@/components/admin/ui";
import { Card } from "@/components/admin/fields";
import { AuditActivityList } from "@/components/admin/audit-activity-list";
import { getAdminSession, sessionCanAccess } from "@/lib/admin/auth";
import { getTeamOverview } from "@/lib/admin/team";
import { formatAdminWhen } from "@/lib/admin/format-time";
import type { AdminScreenKey } from "@/lib/admin/screens";
import { AdminTextLink } from "@/components/admin/admin-text-link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getAdminSession();
  const can = (screen: AdminScreenKey) =>
    Boolean(session && sessionCanAccess(session, screen));

  const [stats, highlights, team] = await Promise.all([
    getDashboardStats(),
    getDashboardHighlights(),
    session?.role === "owner" ? getTeamOverview() : Promise.resolve(null),
  ]);

  const cards = [
    {
      screen: "visits" as const,
      label: "Посетители (30 дни)",
      value: formatNumber(highlights.visitors),
      sub: `${formatNumber(highlights.pageviews)} отворени страници`,
      icon: Eye,
      href: "/admin/visits",
    },
    {
      screen: "payments" as const,
      label: "Оборот (30 дни)",
      value: formatMoney(highlights.revenueCents, highlights.currency),
      sub: `${formatNumber(highlights.orders)} поръчки`,
      icon: CreditCard,
      href: "/admin/payments",
    },
    {
      screen: "engagement" as const,
      label: "Изпратени имейли (30 дни)",
      value: formatNumber(highlights.emailsSent),
      sub: `${formatPercent(highlights.openRate)} отваряемост`,
      icon: BarChart3,
      href: "/admin/engagement",
    },
    {
      screen: "subscribers" as const,
      label: "Активни абонати",
      value: formatNumber(stats.activeSubscribers),
      sub: `${formatNumber(stats.totalSubscribers)} общо`,
      icon: Users,
      href: "/admin/subscribers",
    },
    {
      screen: "blog" as const,
      label: "Публикувани статии",
      value: formatNumber(stats.publishedPosts),
      sub: `${formatNumber(stats.totalPosts)} общо`,
      icon: FileText,
      href: "/admin/blog",
    },
  ].filter((c) => can(c.screen));

  const others = (team?.profiles ?? []).filter((p) => p.role !== "owner");

  return (
    <div>
      <PageHeader
        title="Табло"
        description={
          session?.role === "owner"
            ? "Преглед на сайта и последната работа на екипа."
            : `Здравей, ${session?.displayName ?? "екип"}. Тук виждаш само екраните, до които имаш достъп.`
        }
      />

      {session?.role === "owner" && team && !team.tableReady ? (
        <Alert variant="warning" className="mb-6">
          Пусни SQL миграцията за профили и журнал (<code>052_admin_users_and_audit.sql</code>{" "}
          или <code>supabase/scripts/RUN_PENDING_MIGRATIONS.sql</code>), за да се записват екипът и промените.
        </Alert>
      ) : null}

      {cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => (
            <DashboardStatCard
              key={c.label}
              href={c.href}
              label={c.label}
              value={c.value}
              sub={c.sub}
              icon={c.icon}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-ink/10 bg-white p-6 text-sm text-ink-soft">
          Нямаш достъп до обобщените числа. Отвори разрешените екрани от менюто вляво.
        </p>
      )}

      {session?.role === "owner" && team ? (
        <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card
            title="Екип — последна работа"
            action={
              <AdminTextLink
                href="/admin/team"
                className="text-sm font-medium text-coral-600 hover:underline"
              >
                Профили и права
              </AdminTextLink>
            }
          >
            {others.length === 0 ? (
              <p className="text-sm text-ink-soft">
                Все още няма други профили. Създай такъв с ограничен достъп от „Профили и
                промени“.
              </p>
            ) : (
              <div className="space-y-4">
                {others.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-xl border border-ink/10 bg-cream-2/50 p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium text-ink">{profile.displayName}</p>
                      <p className="text-xs text-ink-soft">
                        тук {formatAdminWhen(profile.lastSeenAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">@{profile.username}</p>
                    <AuditActivityList
                      className="mt-3"
                      items={profile.recent.slice(0, 4)}
                      showActor={false}
                      empty="Няма скорошни промени."
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Последни промени">
            <AuditActivityList
              items={team.feed.slice(0, 12)}
              empty="Все още няма записани действия."
            />
          </Card>
        </section>
      ) : null}

      {can("campaigns") ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-ink">Скорошни кампании</h2>
            <AdminTextLink
              href="/admin/campaigns"
              className="text-sm font-medium text-coral-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35"
            >
              Виж всички
            </AdminTextLink>
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
      ) : null}
    </div>
  );
}
