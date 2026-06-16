import { getAutomations, getSegments } from "@/lib/admin/data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { AutomationsManager } from "@/components/admin/automations-manager";

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const [automations, segments] = await Promise.all([
    getAutomations(),
    getSegments(),
  ]);
  const workerOk = isNotificationWorkerConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Automations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        One-time email or SMS rules — written here, sent automatically when someone
        signs up, purchases, or joins a segment.
      </p>

      {!workerOk && (
        <p className="mt-4 rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Set <code>NOTIFICATION_WORKER_URL</code> and{" "}
          <code>NOTIFICATION_WORKER_API_KEY</code> — otherwise nothing will send.
        </p>
      )}

      <div className="mt-8">
        <AutomationsManager automations={automations} segments={segments} />
      </div>

      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink-soft">
        <p className="font-medium text-ink">How it works</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Purchase email</strong> — create an automation with trigger
            &quot;After purchase&quot;, write your HTML, enable it. Checkout calls{" "}
            <code className="text-xs">POST /api/subscribe</code> with{" "}
            <code className="text-xs">source: &quot;purchase&quot;</code>.
          </li>
          <li>
            <strong>Segment welcome</strong> — tick segments, trigger &quot;Website
            signup&quot; or &quot;Any new subscriber&quot;, enable.
          </li>
          <li>
            <strong>Follow-up sequence</strong> — automation B → &quot;Send only
            after automation&quot; = automation A.
          </li>
          <li>
            Each automation sends <strong>once per email</strong> (tracked automatically).
          </li>
        </ul>
      </div>
    </div>
  );
}
