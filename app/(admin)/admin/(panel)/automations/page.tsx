import { getAutomations, getSegments, getSegmentGroups, getSiteProducts } from "@/lib/admin/data";
import { getFormTemplates } from "@/lib/admin/forms-data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { AutomationsManager } from "@/components/admin/automations-manager";
import { AutomationDiagnostics } from "@/components/admin/automation-diagnostics";
import { Alert, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const [automations, segments, groups, products, forms] = await Promise.all([
    getAutomations(),
    getSegments(),
    getSegmentGroups(),
    getSiteProducts(true),
    getFormTemplates(),
  ]);
  const workerOk = isNotificationWorkerConfigured();

  return (
    <div>
      <PageHeader
        title="Автоматизации"
        description="Автоматични имейли и SMS при записване, покупка или с закъснение."
      >
        {!workerOk && (
          <Alert variant="warning">
            Задай <code>NOTIFICATION_WORKER_URL</code> и{" "}
            <code>NOTIFICATION_WORKER_API_KEY</code> — иначе нищо няма да се изпраща.
          </Alert>
        )}
      </PageHeader>

      <AutomationsManager
          automations={automations}
          segments={segments}
          groups={groups}
          products={products}
          forms={forms}
        />

      <AutomationDiagnostics />

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-4 text-sm text-ink-soft sm:p-5">
        <p className="font-medium text-ink">Пример: welcome серия</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs sm:text-sm">
          <li>Имейл 1 — събитие „Нов абонат“, „Веднага“, без верига.</li>
          <li>Имейл 2 — „След“ Имейл 1 + 15 мин. (или след дни).</li>
          <li>Имейл 3 — след Имейл 2.</li>
        </ol>
      </section>
    </div>
  );
}
