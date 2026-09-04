import { getAdminSession, sessionCanAccess } from "@/lib/admin/auth";
import { getTeamOverview } from "@/lib/admin/team";
import { PageHeader, Alert } from "@/components/admin/ui";
import { Card } from "@/components/admin/fields";
import { AuditActivityList } from "@/components/admin/audit-activity-list";
import { AdminTextLink } from "@/components/admin/admin-text-link";
import { formatAdminWhen } from "@/lib/admin/format-time";
import {
  DashboardOverviewPanel,
  type DashboardAccess,
} from "@/components/admin/dashboard-overview";
import type { AdminScreenKey } from "@/lib/admin/screens";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * The home screen renders from the session alone — every number and chart is
 * fetched by the client from /api/admin/dashboard. A slow or failing report can
 * no longer take the whole page down with it, and the refresh button re-runs
 * just the report.
 */
export default async function AdminDashboard() {
  const session = await getAdminSession();
  const can = (screen: AdminScreenKey) =>
    Boolean(session && sessionCanAccess(session, screen));

  const access: DashboardAccess = {
    visits: can("visits"),
    payments: can("payments"),
    engagement: can("engagement"),
    subscribers: can("subscribers"),
    blog: can("blog"),
    campaigns: can("campaigns"),
  };

  const anyAccess = Object.values(access).some(Boolean);

  let team: Awaited<ReturnType<typeof getTeamOverview>> | null = null;
  if (session?.role === "owner") {
    try {
      team = await getTeamOverview();
    } catch (err) {
      console.error(
        "[admin/dashboard] team:",
        err instanceof Error ? err.message : err,
      );
    }
  }

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

      {anyAccess ? (
        <DashboardOverviewPanel access={access} />
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
    </div>
  );
}
