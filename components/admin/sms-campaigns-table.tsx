"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, Loader2 } from "lucide-react";
import type { SmsCampaign, SmsCampaignStatus } from "@/lib/supabase/types";
import {
  deleteSmsCampaign,
  syncAllSmsCampaigns,
  syncSmsCampaign,
} from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<SmsCampaignStatus, string> = {
  draft: "bg-ink/10 text-ink-soft",
  queued: "bg-gold-400/20 text-gold-500",
  scheduled: "bg-gold-400/20 text-gold-500",
  sending: "bg-gold-400/20 text-gold-500",
  sent: "bg-forest-500/15 text-forest-600",
  partial: "bg-coral-300/30 text-coral-600",
  failed: "bg-coral-500/15 text-coral-600",
  canceled: "bg-ink/10 text-ink-soft",
};

const STATUS_LABEL: Record<SmsCampaignStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  scheduled: "Scheduled",
  sending: "Sending…",
  sent: "Sent",
  partial: "Partial",
  failed: "Failed",
  canceled: "Canceled",
};

function audienceLabel(c: SmsCampaign) {
  return c.segment_tag;
}

export function SmsCampaignsTable({ campaigns }: { campaigns: SmsCampaign[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [autoSynced, setAutoSynced] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const hasWorkerJobs = campaigns.some((c) => c.provider_ref);

  const refreshAll = useCallback(() => {
    setNote(null);
    startTransition(async () => {
      const res = await syncAllSmsCampaigns();
      if (res.message) setNote(res.message);
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (autoSynced || !hasWorkerJobs) return;
    setAutoSynced(true);
    refreshAll();
  }, [autoSynced, hasWorkerJobs, refreshAll]);

  function syncOne(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await syncSmsCampaign(id);
      router.refresh();
      setBusyId(null);
    });
  }

  function remove(c: SmsCampaign) {
    if (!confirm(`Delete SMS campaign? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteSmsCampaign(c.id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">SMS campaigns</h2>
          <p className="mt-0.5 text-xs text-ink-soft/70">
            Sent or scheduled via notification-worker. Status syncs from the worker.
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
          No SMS campaigns yet.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const rowBusy = busyId === c.id && pending;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-ink/10 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold line-clamp-2">
                        {c.message}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[c.status],
                        )}
                      >
                        {STATUS_LABEL[c.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft/70">
                      {audienceLabel(c)} · {c.recipients_count} recipients
                      {(c.status === "sent" ||
                        c.status === "partial" ||
                        c.status === "failed") && (
                        <>
                          {" "}
                          · {c.sent_count} sent
                          {c.failed_count > 0 && `, ${c.failed_count} failed`}
                        </>
                      )}
                      {" · "}
                      {c.scheduled_at
                        ? `scheduled ${formatDate(c.scheduled_at, "en")}`
                        : formatDate(c.sent_at ?? c.created_at, "en")}
                      {c.provider_ref && (
                        <> · job {c.provider_ref.slice(0, 8)}…</>
                      )}
                    </p>
                    {c.error && (
                      <p className="mt-1 text-xs text-coral-600">{c.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => syncOne(c.id)}
                      disabled={pending || !c.provider_ref}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
