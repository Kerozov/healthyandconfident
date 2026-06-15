import { getEmailCampaigns, getSmsCampaigns, getSegments } from "@/lib/admin/data";
import { isSmsConfigured } from "@/lib/sms/notifier";
import { isEmailWorkerConfigured } from "@/lib/worker/email";
import { formatDate } from "@/lib/utils";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { CampaignsTable } from "@/components/admin/campaigns-table";
import { Card } from "@/components/admin/fields";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const [emailCampaigns, smsCampaigns, segments] = await Promise.all([
    getEmailCampaigns(),
    getSmsCampaigns(),
    getSegments(),
  ]);
  const smsConfigured = isSmsConfigured();
  const emailConfigured = isEmailWorkerConfigured();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Campaigns</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Send segmented email &amp; SMS, track opens live and resend to non-openers.
      </p>

      {!emailConfigured && (
        <p className="mt-4 rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
          Email worker is not configured. Set <code>EMAIL_WORKER_URL</code>,{" "}
          <code>EMAIL_WORKER_API_KEY</code> and <code>EMAIL_WORKER_FROM</code>.
        </p>
      )}

      <div className="mt-8">
        <CampaignComposer segments={segments} smsConfigured={smsConfigured} />
      </div>

      <div className="mt-8">
        <CampaignsTable campaigns={emailCampaigns} />
      </div>

      <div className="mt-8">
        <Card title="SMS campaigns">
          {smsCampaigns.length === 0 ? (
            <p className="text-sm text-ink-soft">No SMS campaigns yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                    <th className="py-2 pr-4">Message</th>
                    <th className="py-2 pr-4">Segment</th>
                    <th className="py-2 pr-4">Recipients</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {smsCampaigns.map((c) => (
                    <tr key={c.id} className="border-b border-ink/5 last:border-0">
                      <td className="py-3 pr-4 max-w-xs truncate">{c.message}</td>
                      <td className="py-3 pr-4 text-ink-soft">{c.segment_tag}</td>
                      <td className="py-3 pr-4 text-ink-soft">{c.recipients_count}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-forest-50 px-2.5 py-1 text-xs text-forest-600">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {formatDate(c.created_at, "en")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
