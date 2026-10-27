import { Alert, PageHeader } from "@/components/admin/ui";
import { Card } from "@/components/admin/fields";
import { TeamManager } from "@/components/admin/team-manager";
import { AuditActivityList } from "@/components/admin/audit-activity-list";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { getTeamOverview } from "@/lib/admin/team";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  await requireAdminPage("team");
  const overview = await getTeamOverview();

  return (
    <div>
      <PageHeader
        title="Профили и промени"
        description="Управлявай достъпа и имейл известията за всеки профил. Избери кой да получава новите запитвания и записвания и виж последните промени в панела."
      />

      {overview.tableReady ? null : (
        <Alert variant="warning" className="mb-6">
          Пусни миграция <code>052_admin_users_and_audit.sql</code> (или целия{" "}
          <code>supabase/scripts/SETUP_DATABASE.sql</code> /{" "}
          <code>supabase/scripts/RUN_PENDING_MIGRATIONS.sql</code>) в
          Supabase, за да се записват профилите и журналa.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <TeamManager profiles={overview.profiles} />
        <Card title="Последна активност">
          <AuditActivityList
            items={overview.feed.slice(0, 24)}
            empty="Все още няма записани действия."
          />
        </Card>
      </div>
    </div>
  );
}
