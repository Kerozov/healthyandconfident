import { getAutomations, getSegments, getSegmentGroups, getSiteProducts } from "@/lib/admin/data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { AutomationsManager } from "@/components/admin/automations-manager";

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const [automations, segments, groups, products] = await Promise.all([
    getAutomations(),
    getSegments(),
    getSegmentGroups(),
    getSiteProducts(true),
  ]);
  const workerOk = isNotificationWorkerConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Автоматизации</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Автоматични имейли и SMS при записване, покупка или с закъснение.
      </p>

      {!workerOk && (
        <p className="mt-4 rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Set <code>NOTIFICATION_WORKER_URL</code> and{" "}
          <code>NOTIFICATION_WORKER_API_KEY</code> — otherwise nothing will send.
        </p>
      )}

      <div className="mt-8">
        <AutomationsManager
          automations={automations}
          segments={segments}
          groups={groups}
          products={products}
        />
      </div>

      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink-soft">
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
      </div>
    </div>
  );
}
