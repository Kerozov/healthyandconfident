import { getAutomatedEmails } from "@/lib/admin/data";
import { isNotificationWorkerConfigured } from "@/lib/worker/config";
import { AutomatedEmailEditor } from "@/components/admin/automated-email-editor";
import type { AutomationTrigger } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SECTIONS: { trigger: AutomationTrigger; label: string }[] = [
  { trigger: "registration", label: "Registration" },
  { trigger: "purchase", label: "Purchase" },
];

export default async function AdminAutomationsPage() {
  const configs = await getAutomatedEmails();
  const workerOk = isNotificationWorkerConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Automated emails</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Welcome and thank-you emails sent automatically after signup or purchase.
        Turn each one on/off and edit the message per language.
      </p>

      {!workerOk && (
        <p className="mt-4 rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Set <code>NOTIFICATION_WORKER_URL</code> and{" "}
          <code>NOTIFICATION_WORKER_API_KEY</code> in .env — otherwise emails will
          not send.
        </p>
      )}

      <div className="mt-8 space-y-10">
        {SECTIONS.map((section) => {
          const rows = configs.filter((c) => c.trigger === section.trigger);
          return (
            <section key={section.trigger}>
              <h2 className="font-display text-xl font-semibold">{section.label}</h2>
              <div className="mt-4 grid gap-6 xl:grid-cols-2">
                {rows.map((c) => (
                  <AutomatedEmailEditor key={c.id} config={c} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink-soft">
        <p className="font-medium text-ink">Purchase integration</p>
        <p className="mt-1">
          When you add checkout, call{" "}
          <code className="text-xs">POST /api/subscribe</code> with{" "}
          <code className="text-xs">{`{ "email", "name", "locale", "source": "purchase" }`}</code>{" "}
          to trigger the purchase email.
        </p>
      </div>
    </div>
  );
}
