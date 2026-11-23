"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
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
  Ban,
} from "lucide-react";
import type { EmailCampaign, CampaignStatus } from "@/lib/supabase/types";
import {
  syncAllEmailCampaigns,
  syncEmailCampaign,
  resendToNonOpeners,
  deleteEmailCampaign,
  cancelEmailCampaign,
  getCampaignRecipientReport,
} from "@/app/(admin)/admin/actions";
import { CampaignCtaEditor } from "@/components/admin/campaign-cta-editor";
import { CopyEmailButton } from "@/components/admin/email-clipboard";
import { copiedEmailFromCampaign } from "@/lib/email/content-clipboard";
import type { RecipientRow } from "@/lib/worker/email";
import { formatDate } from "@/lib/utils";
import { formatScheduledAt } from "@/lib/datetime";
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
  draft: "Чернова",
  queued: "Чака",
  scheduled: "Насрочена",
  sending: "Изпраща се…",
  sent: "Изпратена",
  partial: "Частично",
  failed: "Неуспешна",
  canceled: "Отменена",
};

const RECIPIENT_STATUS_STYLES: Record<string, string> = {
  clicked: "text-forest-600 bg-forest-500/10",
  opened: "text-forest-600 bg-forest-500/10",
  delivered: "text-forest-600 bg-forest-500/10",
  sent: "text-ink-soft bg-ink/5",
  pending: "text-gold-600 bg-gold-400/15",
  bounced: "text-coral-600 bg-coral-500/15",
  complained: "text-coral-600 bg-coral-500/15",
  failed: "text-coral-600 bg-coral-500/15",
};

const RECIPIENT_STATUS_LABEL: Record<string, string> = {
  pending: "чака",
  sent: "изпратен",
  delivered: "доставен",
  opened: "отворил",
  clicked: "кликнал",
  bounced: "върнат",
  complained: "спам",
  failed: "не тръгна",
  canceled: "отменен",
};

function openRate(c: EmailCampaign) {
  const base = c.sent_count || c.recipients_count;
  if (!base) return 0;
  return Math.round((c.opened_count / base) * 100);
}

function clickRate(c: EmailCampaign) {
  const base = c.sent_count || c.recipients_count;
  if (!base) return 0;
  return Math.round(((c.clicked_count ?? 0) / base) * 100);
}

function audienceLabel(c: EmailCampaign) {
  if (c.target_tags?.length) {
    // Exclusions live only in segment_tag (" · без:key1,key2"), so carry them over.
    const without = c.segment_tag.match(/ · без:.*$/)?.[0] ?? "";
    return `tags: ${c.target_tags.join(", ")}${without}`;
  }
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
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        RECIPIENT_STATUS_STYLES[status] ?? "bg-ink/5 text-ink-soft",
      )}
    >
      {RECIPIENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function CampaignsTable({
  campaigns,
}: {
  campaigns: EmailCampaign[];
}) {
  const router = useRouter();
  // Two transitions: the refresh of every campaign runs on its own, so the
  // buttons of each campaign stay usable while it does (it used to grey them
  // all out for as long as the refresh took).
  const [syncingAll, startSyncAll] = useTransition();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Ref, not state: the one-shot sync must not trigger an extra render. */
  const autoSyncedRef = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[] | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const hasWorkerJobs = campaigns.some((c) => c.worker_job_id);

  const refreshAll = useCallback(() => {
    setNote(null);
    startSyncAll(async () => {
      const res = await syncAllEmailCampaigns();
      if (res.message) setNote(res.message);
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (autoSyncedRef.current || !hasWorkerJobs) return;
    autoSyncedRef.current = true;
    refreshAll();
  }, [hasWorkerJobs, refreshAll]);

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
        `Да изпратя ли „${c.subject}“ пак на ${c.not_opened_count} души, които не са го отворили? Върнатите адреси не влизат.`,
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
    if (!confirm(`Да изтрия ли кампанията „${c.subject}“? Не може да се върне.`)) return;
    setBusyId(c.id);
    startTransition(async () => {
      await deleteEmailCampaign(c.id);
      router.refresh();
      setBusyId(null);
    });
  }

  function cancel(c: EmailCampaign) {
    if (
      !confirm(
        `Да отменя ли „${c.subject}“? Никой няма да получи този имейл.`,
      )
    ) {
      return;
    }
    setBusyId(c.id);
    setNote(null);
    startTransition(async () => {
      const res = await cancelEmailCampaign(c.id);
      setNote(res.message ?? null);
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
          <h2 className="font-display text-lg font-semibold">Имейл кампании</h2>
          <p className="mt-0.5 text-xs text-ink-soft/70">
            Числата идват от worker-а. Върнатите адреси не се броят към неотворилите.
          </p>
          {note && <p className="mt-0.5 text-xs text-ink-soft">{note}</p>}
        </div>
        <button
          onClick={refreshAll}
          disabled={syncingAll}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
        >
          {syncingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {syncingAll ? "Обновявам…" : "Обнови статистиката"}
        </button>
      </div>

      {campaigns.length === 0 ? (
        <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
          Още няма имейл кампании.
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const rate = openRate(c);
            const ctr = clickRate(c);
            const isResend = Boolean(c.parent_campaign_id);
            const canResend =
              Boolean(c.worker_job_id) &&
              ["sent", "partial"].includes(c.status) &&
              c.not_opened_count > 0;
            const canCancel = ["scheduled", "queued"].includes(c.status);
            const rowBusy = busyId === c.id && pending;
            const isExpanded = expandedId === c.id;
            const total = c.total_count || c.recipients_count;
            // Not sent yet: a row of zeros and a red "failed" said nothing useful.
            const waiting = canCancel;
            const notSent = c.status === "canceled" && c.sent_count === 0;
            // Invalid addresses on an otherwise sent campaign are not an alarm.
            const failedTone =
              c.status === "failed" || c.status === "partial" ? "bad" : "muted";

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
                        ? `за ${formatScheduledAt(c.scheduled_at, "bg")}`
                        : formatDate(c.created_at, "bg")}
                      {c.last_synced_at && (
                        <> · обновено {formatDate(c.last_synced_at, "bg")}</>
                      )}
                    </p>
                    {c.error && (
                      <p className="mt-1 text-xs text-coral-600">{c.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <CopyEmailButton
                      build={() => copiedEmailFromCampaign(c)}
                      disabled={!c.html?.trim()}
                      className="mr-1"
                    />
                    {canCancel && (
                      <button
                        onClick={() => cancel(c)}
                        disabled={pending}
                        title="Отмени изпращането"
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-coral-600 hover:bg-coral-500/10 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                        Отмени
                      </button>
                    )}
                    <button
                      onClick={() => syncOne(c.id)}
                      disabled={pending || !c.worker_job_id}
                      title="Обнови тази кампания"
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
                      title="Изтрий"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {waiting || notSent ? (
                  <p className="mt-4 border-t border-ink/10 pt-4 text-sm text-ink-soft">
                    {notSent ? (
                      "Отменена преди да тръгне — никой не я е получил."
                    ) : c.scheduled_at ? (
                      <>
                        Тръгва на{" "}
                        <strong className="text-ink">
                          {formatScheduledAt(c.scheduled_at, "bg")}
                        </strong>{" "}
                        до <strong className="text-ink">{total - c.failed_count}</strong> души.
                      </>
                    ) : (
                      <>
                        Чака да тръгне до{" "}
                        <strong className="text-ink">{total - c.failed_count}</strong> души.
                      </>
                    )}
                    {!notSent && c.failed_count > 0 && (
                      <span className="text-ink-soft/70">
                        {" "}
                        {c.failed_count === 1
                          ? "1 невалиден адрес се пропуска."
                          : `${c.failed_count} невалидни адреса се пропускат.`}
                      </span>
                    )}
                  </p>
                ) : (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-ink/10 pt-4">
                  <Metric label="Общо" value={total} tone="muted" />
                  <Metric label="Изпратени" value={c.sent_count} />
                  <Metric label="Доставени" value={c.delivered_count} tone="good" />
                  <Metric
                    label="Отворили"
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
                  <Metric
                    label="Кликнали"
                    value={
                      <span>
                        {c.clicked_count ?? 0}
                        <span className="ml-1 text-xs font-normal text-ink-soft/60">
                          {ctr}%
                        </span>
                      </span>
                    }
                    tone="good"
                  />
                  <Metric label="Неотворили" value={c.not_opened_count} tone="muted" />
                  {(c.bounced_count ?? 0) > 0 && (
                    <Metric label="Върнати" value={c.bounced_count} tone="muted" />
                  )}
                  {c.failed_count > 0 && (
                    <Metric label="Не тръгнаха" value={c.failed_count} tone={failedTone} />
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
                )}

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
                    {isExpanded ? "Скрий получателите" : "Покажи получателите"}
                  </button>
                )}

                {isExpanded && (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10">
                    {loadingRecipients ? (
                      <p className="p-4 text-sm text-ink-soft">Зареждам…</p>
                    ) : recipients && recipients.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
                            <th className="px-4 py-2">Имейл</th>
                            <th className="px-4 py-2">Статус</th>
                            <th className="px-4 py-2">Изпратен</th>
                            <th className="px-4 py-2">Отворен</th>
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
                                {r.sentAt ? formatDate(r.sentAt, "bg") : "-"}
                              </td>
                              <td className="px-4 py-2 text-xs text-ink-soft">
                                {r.openedAt ? formatDate(r.openedAt, "bg") : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-sm text-ink-soft">Няма данни за получателите.</p>
                    )}
                  </div>
                )}

                <CampaignCtaEditor
                  campaignId={c.id}
                  initialLabel={c.cta_label ?? ""}
                  initialUrl={c.cta_url ?? ""}
                />

                {canResend && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-2/50 px-4 py-3">
                    <p className="text-sm text-ink-soft">
                      <MailOpen className="mr-1.5 inline h-4 w-4 text-coral-500" />
                      <strong>{c.not_opened_count}</strong>{" "}
                      {c.not_opened_count === 1 ? "човек още не е отворил" : "души още не са отворили"}
                      {(c.bounced_count ?? 0) > 0 && (
                        <> · {c.bounced_count} върнати не влизат</>
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
                      Изпрати пак на неотворилите
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
