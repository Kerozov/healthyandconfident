import { getAutomations, getSegments, getSegmentGroups, getSiteProducts } from "@/lib/admin/data";
import { getFormTemplates } from "@/lib/admin/forms-data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { AutomationsManager } from "@/components/admin/automations-manager";
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

      <section className="mt-10 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink-soft">
        <p className="font-medium text-ink">Бърз пример: welcome серия от 3 имейла</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>
            <strong>Имейл 1</strong> — събитие „Нов абонат“, режим „Веднага“, без верига.
          </li>
          <li>
            <strong>Имейл 2</strong> — същото събитие, „След 2 дни“, верига „След Имейл 1“.
          </li>
          <li>
            <strong>Имейл 3</strong> — „След 5 дни“, верига „След Имейл 2“.
          </li>
        </ol>
        <p className="mt-3 text-xs">
          Всяка автоматизация се изпраща само веднъж на имейл. Включи ги с бутона
          „Включена“.
        </p>
      </section>
    </div>
  );
}
