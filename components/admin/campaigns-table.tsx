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
} from "lucide-react";
import type { EmailCampaign, CampaignStatus } from "@/lib/supabase/types";
import {
  syncAllEmailCampaigns,
  syncEmailCampaign,
  resendToNonOpeners,
  deleteEmailCampaign,
} from "@/app/(admin)/admin/actions";
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

function openRate(c: EmailCampaign) {
  const base = c.sent_count || c.recipients_count;
  if (!base) return 0;
  return Math.round((c.opened_count / base) * 100);
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "muted";
}) {
  return (
    <div className="min-w-[64px]">
      <p
        className={cn(
          "font-display text-lg font-semibold leading-none",
          tone === "good" && "text-forest-600",
          tone === "bad" && "text-coral-600",
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

  // Auto-sync once on mount so the table is always live when you open it.
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
        `Resend "${c.subject}" to everyone who hasn't opened it yet?`,
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Email campaigns</h2>
          <p className="mt-0.5 text-xs text-ink-soft/70">
            Open counts are synced from the email worker (automated prefetch
            opens are filtered there).
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
                      {c.segment_tag}
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

                {/* Metrics */}
                <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-ink/10 pt-4">
                  <Metric label="Recipients" value={c.recipients_count} tone="muted" />
                  <Metric label="Sent" value={c.sent_count} />
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
                  {c.machine_opened_count > 0 && (
                    <Metric
                      label="Auto (filtered)"
                      value={c.machine_opened_count}
                      tone="muted"
                    />
                  )}
                  <Metric
                    label="Failed"
                    value={c.failed_count}
                    tone={c.failed_count > 0 ? "bad" : "muted"}
                  />

                  {/* Open-rate bar */}
                  <div className="ml-auto flex min-w-[160px] flex-1 items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-forest-500 transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Resend action */}
                {canResend && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-2/50 px-4 py-3">
                    <p className="text-sm text-ink-soft">
                      <MailOpen className="mr-1.5 inline h-4 w-4 text-coral-500" />
                      <strong>{c.not_opened_count}</strong> haven&apos;t opened this yet.
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
