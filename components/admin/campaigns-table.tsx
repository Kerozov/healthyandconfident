"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Send,
  Trash2,
  MailOpen,
  CornerDownRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { EmailCampaign, CampaignStatus } from "@/lib/supabase/types";
import {
  syncAllEmailCampaigns,
  syncEmailCampaign,
  resendToNonOpeners,
  deleteEmailCampaign,
  getCampaignRecipientReport,
} from "@/app/(admin)/admin/actions";
import type { RecipientRow } from "@/lib/worker/email";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  draft: "bg-ink/10 text-ink-soft",
  queued: "bg-gold-400/20 text-gold-500",
  scheduled: "bg-gold-400/20 text-gold-500",
  sending: "bg-gold-400/20 text-gold-500",
  sent: "bg-forest-500/15 text-forest-600",
  partial: "bg-coral-300/30 text-coral-600",
  failed: "bg-coral-500/15 text-coral-600",
  canceled: "bg-ink/10 text-ink-soft",
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  scheduled: "Scheduled",
  sending: "Sending…",
  sent: "Sent",
  partial: "Partial",
  failed: "Failed",
  canceled: "Canceled",
};

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  opened: "text-forest-600 bg-forest-500/10",
  delivered: "text-forest-600 bg-forest-500/10",
  sent: "text-ink-soft bg-ink/5",
  pending: "text-gold-600 bg-gold-400/15",
  bounced: "text-coral-600 bg-coral-500/15",
  failed: "text-coral-600 bg-coral-500/15",
};

function openRate(c: EmailCampaign) {
  const base = c.sent_count || c.recipients_count;
  if (!base) return 0;
  return Math.round((c.opened_count / base) * 100);
}

function audienceLabel(c: EmailCampaign) {
  if (c.target_tags?.length) return `tags: ${c.target_tags.join(", ")}`;
  return c.segment_tag;
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "muted" | "warn";
}) {
  return (
    <div className="min-w-[64px]">
      <p
        className={cn(
          "font-display text-lg font-semibold leading-none",
          tone === "good" && "text-forest-600",
          tone === "bad" && "text-coral-600",
          tone === "warn" && "text-gold-600",
          tone === "muted" && "text-ink-soft",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-soft/60">
        {label}
      </p>
    </div>
  );
}

function RecipientStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        RECIPIENT_STATUS_STYLES[status] ?? "bg-ink/5 text-ink-soft",
      )}
    >
      {status}
    </span>
  );
}

export function CampaignsTable({
  campaigns,
}: {
  campaigns: EmailCampaign[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoSynced, setAutoSynced] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[] | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const hasLiveJobs = campaigns.some(
    (c) =>
      c.worker_job_id &&
      ["queued", "scheduled", "sending", "sent", "partial"].includes(c.status),
  );

  const refreshAll = useCallback(() => {
    setNote(null);
    startTransition(async () => {
      const res = await syncAllEmailCampaigns();
      if (res.message) setNote(res.message);
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (autoSynced || !hasLiveJobs) return;
    setAutoSynced(true);
    refreshAll();
  }, [autoSynced, hasLiveJobs, refreshAll]);

  function syncOne(id: string) {
    setBusyId(id);
    setNote(null);
    startTransition(async () => {
      await syncEmailCampaign(id);
      router.refresh();
      setBusyId(null);
    });
  }

  function resend(c: EmailCampaign) {
    if (
      !confirm(
        `Resend "${c.subject}" to ${c.not_opened_count} subscriber(s) who haven't opened it? (Bounced addresses are excluded.)`,
      )
    )
      return;
    setBusyId(c.id);
    setNote(null);
    startTransition(async () => {
      const res = await resendToNonOpeners({ campaignId: c.id });
      setNote(res.message ?? null);
      router.refresh();
      setBusyId(null);
    });
  }

  function remove(c: EmailCampaign) {
    if (!confirm(`Delete campaign "${c.subject}"? This cannot be undone.`)) return;
    setBusyId(c.id);
    startTransition(async () => {
      await deleteEmailCampaign(c.id);
      router.refresh();
      setBusyId(null);
    });
  }

  async function toggleRecipients(campaignId: string) {
    if (expandedId === campaignId) {
      setExpandedId(null);
      setRecipients(null);
      return;
    }
    setExpandedId(campaignId);
    setLoadingRecipients(true);
    setRecipients(null);
    const res = await getCampaignRecipientReport(campaignId);
    setLoadingRecipients(false);
    if (res.ok) setRecipients(res.recipients);
    else setRecipients([]);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Email campaigns</h2>
          <p className="mt-0.5 text-xs text-ink-soft/70">
            Live stats from the notification worker. Bounced addresses are not
            counted as non-openers.
          </p>
          {note && <p className="mt-0.5 text-xs text-ink-soft">{note}</p>}
        </div>
        <button
          onClick={refreshAll}
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh status
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
          No email campaigns yet.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const rate = openRate(c);
            const isResend = Boolean(c.parent_campaign_id);
            const canResend =
              Boolean(c.worker_job_id) &&
              ["sent", "partial"].includes(c.status) &&
              c.not_opened_count > 0;
            const rowBusy = busyId === c.id && pending;
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-ink/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isResend && (
                        <CornerDownRight className="h-4 w-4 text-coral-500" />
                      )}
                      <span className="font-display text-base font-semibold">
                        {c.subject}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[c.status],
                        )}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                      {isResend && (
                        <span className="rounded-full bg-coral-300/25 px-2 py-0.5 text-[11px] font-medium text-coral-600">
                          resend
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-soft/70">
                      {audienceLabel(c)}
                      {c.locale ? ` · ${c.locale.toUpperCase()}` : ""} ·{" "}
                      {c.scheduled_at
                        ? `scheduled ${formatDate(c.scheduled_at, "en")}`
                        : formatDate(c.created_at, "en")}
                      {c.last_synced_at && (
                        <> · synced {formatDate(c.last_synced_at, "en")}</>
                      )}
                    </p>
                    {c.error && (
                      <p className="mt-1 text-xs text-coral-600">{c.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => syncOne(c.id)}
                      disabled={pending || !c.worker_job_id}
                      title="Sync this campaign"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-40"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(c)}
                      disabled={pending}
                      title="Delete"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-ink/10 pt-4">
                  <Metric label="Total" value={c.total_count || c.recipients_count} tone="muted" />
                  <Metric label="Sent" value={c.sent_count} />
                  <Metric label="Delivered" value={c.delivered_count} tone="good" />
                  <Metric
                    label="Opened"
                    value={
                      <span>
                        {c.opened_count}
                        <span className="ml-1 text-xs font-normal text-ink-soft/60">
                          {rate}%
                        </span>
                      </span>
                    }
                    tone="good"
                  />
                  <Metric label="Not opened" value={c.not_opened_count} tone="muted" />
                  {(c.bounced_count ?? 0) > 0 && (
                    <Metric label="Bounced" value={c.bounced_count} tone="bad" />
                  )}
                  {c.failed_count > 0 && (
                    <Metric label="Failed" value={c.failed_count} tone="bad" />
                  )}

                  <div className="ml-auto flex min-w-[160px] flex-1 items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-forest-500 transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {c.worker_job_id && (
                  <button
                    onClick={() => toggleRecipients(c.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {isExpanded ? "Hide" : "Show"} per-recipient status
                  </button>
                )}

                {isExpanded && (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10">
                    {loadingRecipients ? (
                      <p className="p-4 text-sm text-ink-soft">Loading…</p>
                    ) : recipients && recipients.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Sent</th>
                            <th className="px-4 py-2">Opened</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipients.map((r) => (
                            <tr key={r.email} className="border-b border-ink/5 last:border-0">
                              <td className="px-4 py-2 font-mono text-xs">{r.email}</td>
                              <td className="px-4 py-2">
                                <RecipientStatusBadge status={r.status} />
                              </td>
                              <td className="px-4 py-2 text-xs text-ink-soft">
                                {r.sentAt ? formatDate(r.sentAt, "en") : "—"}
                              </td>
                              <td className="px-4 py-2 text-xs text-ink-soft">
                                {r.openedAt ? formatDate(r.openedAt, "en") : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-sm text-ink-soft">No recipient data.</p>
                    )}
                  </div>
                )}

                {canResend && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-2/50 px-4 py-3">
                    <p className="text-sm text-ink-soft">
                      <MailOpen className="mr-1.5 inline h-4 w-4 text-coral-500" />
                      <strong>{c.not_opened_count}</strong> haven&apos;t opened this yet
                      {(c.bounced_count ?? 0) > 0 && (
                        <> ({c.bounced_count} bounced — excluded)</>
                      )}
                      .
                    </p>
                    <button
                      onClick={() => resend(c)}
                      disabled={pending}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-coral-500 px-4 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
                    >
                      {rowBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Resend to non-openers
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
