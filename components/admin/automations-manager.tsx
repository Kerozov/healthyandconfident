"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  RefreshCw,
  Send,
  MailOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  Automation,
  AutomationChannel,
  AutomationDelivery,
  AutomationTrigger,
  AutomationStats,
  Segment,
} from "@/lib/supabase/types";
import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationEnabled,
  syncAllAutomations,
  syncAutomation,
  getAutomationDeliveriesReport,
  resendAutomationToNonOpeners,
} from "@/app/(admin)/admin/actions";
import { SegmentChecklist } from "@/components/admin/segment-checklist";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TRIGGER_OPTIONS: {
  value: AutomationTrigger;
  label: string;
  hint: string;
}[] = [
  {
    value: "new_subscriber",
    label: "New subscriber",
    hint: "When an email appears in the list for the first time — website, manual add, or import.",
  },
  {
    value: "registration",
    label: "Website signup",
    hint: "Popup or lead form only (not manual add in admin).",
  },
  {
    value: "purchase",
    label: "After purchase",
    hint: 'When the system receives a purchase event (source: "purchase").',
  },
];

function TogglePair({
  label,
  hint,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  options: { trueLabel: string; falseLabel: string };
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="inline-flex rounded-xl border border-ink/15 bg-cream-2/40 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
            value
              ? "bg-forest-600 text-cream shadow-sm"
              : "text-ink-soft hover:bg-ink/5",
          )}
        >
          {options.trueLabel}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
            !value
              ? "bg-ink/15 text-ink shadow-sm"
              : "text-ink-soft hover:bg-ink/5",
          )}
        >
          {options.falseLabel}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-soft/70">{hint}</p>}
    </div>
  );
}

function triggerSummary(a: Automation): string {
  const t = TRIGGER_OPTIONS.find((x) => x.value === a.trigger_event);
  return t?.label ?? a.trigger_event;
}

function audienceSummary(newOnly: boolean): string {
  return newOnly ? "new only" : "new + existing";
}

type AutomationRow = Automation & AutomationStats;

type DeliveryFilter = "all" | "sent" | "scheduled" | "failed";

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  opened: "text-forest-600 bg-forest-500/10",
  delivered: "text-forest-600 bg-forest-500/10",
  sent: "text-ink-soft bg-ink/5",
  pending: "text-gold-600 bg-gold-400/15",
  scheduled: "text-gold-600 bg-gold-400/15",
  bounced: "text-coral-600 bg-coral-500/15",
  failed: "text-coral-600 bg-coral-500/15",
  canceled: "text-ink-soft bg-ink/10",
  skipped: "text-ink-soft bg-ink/10",
};

function openRate(a: AutomationRow) {
  if (!a.sent_count) return 0;
  return Math.round((a.opened_count / a.sent_count) * 100);
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

function DeliveryStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        DELIVERY_STATUS_STYLES[status] ?? "bg-ink/5 text-ink-soft",
      )}
    >
      {status}
    </span>
  );
}

function filterDeliveries(
  rows: AutomationDelivery[],
  filter: DeliveryFilter,
): AutomationDelivery[] {
  if (filter === "all") return rows;
  if (filter === "sent") return rows.filter((d) => d.status === "sent");
  if (filter === "scheduled") return rows.filter((d) => d.status === "scheduled");
  return rows.filter((d) => d.status === "failed");
}

const EMPTY_FORM = {
  name: "",
  channel: "email" as AutomationChannel,
  trigger_event: "new_subscriber" as AutomationTrigger,
  enabled: false,
  segment_keys: [] as string[],
  new_subscribers_only: true,
  after_automation_id: "" as string,
  delay_days: 0,
  subject_bg: "",
  html_bg: "",
  subject_en: "",
  html_en: "",
  sms_bg: "",
  sms_en: "",
  sort_order: 0,
};

function automationToForm(a: Automation): typeof EMPTY_FORM {
  return {
    name: a.name,
    channel: a.channel,
    trigger_event: a.trigger_event,
    enabled: a.enabled,
    segment_keys: a.segment_keys ?? [],
    new_subscribers_only: a.new_subscribers_only,
    after_automation_id: a.after_automation_id ?? "",
    delay_days: a.delay_days ?? 0,
    subject_bg: a.subject_bg,
    html_bg: a.html_bg,
    subject_en: a.subject_en,
    html_en: a.html_en,
    sms_bg: a.sms_bg,
    sms_en: a.sms_en,
    sort_order: a.sort_order,
  };
}

export function AutomationsManager({
  automations,
  segments,
}: {
  automations: AutomationRow[];
  segments: Segment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [autoSynced, setAutoSynced] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<AutomationDelivery[] | null>(null);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");

  const hasTrackable = automations.some(
    (a) => a.sent_count > 0 || a.scheduled_count > 0,
  );

  const refreshAll = useCallback(() => {
    setNote(null);
    startTransition(async () => {
      const res = await syncAllAutomations();
      if (res.message) setNote(res.message);
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (autoSynced || !hasTrackable) return;
    setAutoSynced(true);
    refreshAll();
  }, [autoSynced, hasTrackable, refreshAll]);

  const otherAutomations = automations.filter(
    (a) => editingId !== "new" && a.id !== editingId,
  );

  function openNew() {
    setEditingId("new");
    setForm({ ...EMPTY_FORM, sort_order: (automations.length + 1) * 10 });
    setError(null);
    setSaved(false);
  }

  function openEdit(a: AutomationRow) {
    setEditingId(a.id);
    setForm(automationToForm(a));
    setError(null);
    setSaved(false);
  }

  function closeEditor() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        after_automation_id: form.after_automation_id || null,
      };
      const res =
        editingId === "new"
          ? await createAutomation(payload)
          : await updateAutomation(editingId!, payload);
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setSaved(true);
      closeEditor();
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete automation "${name}"?`)) return;
    startTransition(async () => {
      await deleteAutomation(id);
      router.refresh();
    });
  }

  function toggleEnabled(a: AutomationRow) {
    startTransition(async () => {
      await toggleAutomationEnabled(a.id, !a.enabled);
      router.refresh();
    });
  }

  function syncOne(id: string) {
    setBusyId(id);
    setNote(null);
    startTransition(async () => {
      const res = await syncAutomation(id);
      if (res.message) setNote(res.message);
      router.refresh();
      setBusyId(null);
    });
  }

  function resend(a: AutomationRow) {
    if (
      !confirm(
        `Resend "${a.name}" to ${a.not_opened_count} subscriber(s) who haven't opened it? (Bounced addresses are excluded.)`,
      )
    ) {
      return;
    }
    setBusyId(a.id);
    setNote(null);
    startTransition(async () => {
      const res = await resendAutomationToNonOpeners(a.id);
      setNote(res.message ?? null);
      router.refresh();
      setBusyId(null);
    });
  }

  async function toggleDeliveries(automationId: string) {
    if (expandedId === automationId) {
      setExpandedId(null);
      setDeliveries(null);
      setDeliveryFilter("all");
      return;
    }
    setExpandedId(automationId);
    setLoadingDeliveries(true);
    setDeliveries(null);
    setDeliveryFilter("all");
    const res = await getAutomationDeliveriesReport(automationId);
    setLoadingDeliveries(false);
    if (res.ok) setDeliveries(res.deliveries);
    else setDeliveries([]);
    router.refresh();
  }

  const triggerMeta = TRIGGER_OPTIONS.find((t) => t.value === form.trigger_event);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft max-w-2xl">
            Automatic emails or SMS on new subscribers, purchases, or on a delay.
            By default they go to new subscribers only — once per email, no
            duplicates.
          </p>
          {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh stats
          </button>
          <button
            type="button"
            onClick={openNew}
            disabled={pending || editingId !== null}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-5 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> New automation
          </button>
        </div>
      </div>

      {editingId && (
        <Card title={editingId === "new" ? "Create automation" : "Edit automation"}>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Welcome — weight loss"
                />
              </Field>
              <Field label="Channel">
                <Select
                  value={form.channel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel: e.target.value as AutomationChannel,
                    })
                  }
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </Field>
              <Field label="When to send">
                <Select
                  value={form.trigger_event}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      trigger_event: e.target.value as AutomationTrigger,
                    })
                  }
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Order" hint="Lower number runs first if several match.">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>

            {triggerMeta && (
              <p className="rounded-xl bg-cream-2/60 px-4 py-3 text-sm text-ink-soft">
                {triggerMeta.hint}
              </p>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <TogglePair
                label="Status"
                hint={
                  form.enabled
                    ? "This automation is active and will send when conditions match."
                    : "Disabled — nothing is sent, even for new subscribers."
                }
                value={form.enabled}
                onChange={(enabled) => setForm({ ...form, enabled })}
                options={{ trueLabel: "Enabled", falseLabel: "Disabled" }}
                disabled={pending}
              />
              <TogglePair
                label="Who receives it"
                hint={
                  form.new_subscribers_only
                    ? "Only the first time this email is added. Recommended for welcome series."
                    : "New and already saved emails (uncommon — may resend to existing contacts)."
                }
                value={form.new_subscribers_only}
                onChange={(new_subscribers_only) =>
                  setForm({ ...form, new_subscribers_only })
                }
                options={{
                  trueLabel: "New only",
                  falseLabel: "New + existing",
                }}
                disabled={pending}
              />
            </div>

            <Field
              label="Segments (optional)"
              hint="Leave empty for everyone. Subscriber must match at least one selected segment."
            >
              <SegmentChecklist
                segments={segments}
                selected={form.segment_keys}
                onChange={(segment_keys) => setForm({ ...form, segment_keys })}
                disabled={pending}
              />
            </Field>

            <Field
              label="After another automation"
              hint="Optional — sends only if the chosen automation was already sent (e.g. welcome → follow-up)."
            >
              <Select
                value={form.after_automation_id}
                onChange={(e) =>
                  setForm({ ...form, after_automation_id: e.target.value })
                }
              >
                <option value="">— None —</option>
                {otherAutomations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.channel})
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Delay (days)"
              hint="0 = send immediately. With a prerequisite, days are counted after that automation."
            >
              <Input
                type="number"
                min={0}
                value={form.delay_days}
                onChange={(e) =>
                  setForm({
                    ...form,
                    delay_days: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </Field>

            {form.channel === "email" ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-ink/10 p-4">
                  <p className="font-medium">Bulgarian</p>
                  <Field label="Subject">
                    <Input
                      value={form.subject_bg}
                      onChange={(e) =>
                        setForm({ ...form, subject_bg: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="HTML" hint="{{name}}, {{email}}">
                    <Textarea
                      rows={8}
                      className="font-mono text-[13px]"
                      value={form.html_bg}
                      onChange={(e) =>
                        setForm({ ...form, html_bg: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="space-y-3 rounded-xl border border-ink/10 p-4">
                  <p className="font-medium">English</p>
                  <Field label="Subject">
                    <Input
                      value={form.subject_en}
                      onChange={(e) =>
                        setForm({ ...form, subject_en: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="HTML" hint="{{name}}, {{email}}">
                    <Textarea
                      rows={8}
                      className="font-mono text-[13px]"
                      value={form.html_en}
                      onChange={(e) =>
                        setForm({ ...form, html_en: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-2">
                <Field label="SMS — Bulgarian" hint="{{name}}, {{email}}">
                  <Textarea
                    rows={4}
                    value={form.sms_bg}
                    onChange={(e) => setForm({ ...form, sms_bg: e.target.value })}
                  />
                </Field>
                <Field label="SMS — English" hint="{{name}}, {{email}}">
                  <Textarea
                    rows={4}
                    value={form.sms_en}
                    onChange={(e) => setForm({ ...form, sms_en: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {error && <p className="text-sm text-coral-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={pending || !form.name.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-6 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
              >
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-medium hover:bg-ink/5"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {automations.length === 0 ? (
          <p className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
            No automations yet. Create a welcome email, segment SMS, or post-purchase
            series.
          </p>
        ) : (
          automations.map((a) => {
            const rate = openRate(a);
            const rowBusy = busyId === a.id && pending;
            const isExpanded = expandedId === a.id;
            const canResend =
              a.channel === "email" &&
              a.sent_count > 0 &&
              a.not_opened_count > 0;
            const filteredDeliveries = deliveries
              ? filterDeliveries(deliveries, deliveryFilter)
              : [];

            return (
            <div
              key={a.id}
              className="rounded-2xl border border-ink/10 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg font-semibold">{a.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                        a.enabled
                          ? "bg-forest-500/15 text-forest-600"
                          : "bg-ink/10 text-ink-soft",
                      )}
                    >
                      {a.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs uppercase text-ink-soft">
                      {a.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {triggerSummary(a)}
                    {a.segment_keys.length > 0 &&
                      ` · segments: ${a.segment_keys.join(", ")}`}
                    {` · ${audienceSummary(a.new_subscribers_only)}`}
                    {a.after_automation_id &&
                      ` · after: ${
                        automations.find((x) => x.id === a.after_automation_id)?.name ??
                        "…"
                      }`}
                    {(a.delay_days ?? 0) > 0 && ` · +${a.delay_days} days`}
                  </p>
                  {a.last_synced_at && (
                    <p className="mt-0.5 text-xs text-ink-soft/70">
                      Stats synced {formatDate(a.last_synced_at, "en")}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => syncOne(a.id)}
                    disabled={pending || a.sent_count + a.scheduled_count === 0}
                    title="Sync stats from worker"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 disabled:opacity-40"
                  >
                    {rowBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleEnabled(a)}
                    disabled={pending}
                    title={a.enabled ? "Disable automation" : "Enable automation"}
                    className={cn(
                      "inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold",
                      a.enabled
                        ? "bg-forest-500/15 text-forest-700 hover:bg-forest-500/25"
                        : "bg-ink/10 text-ink-soft hover:bg-ink/15",
                    )}
                  >
                    {a.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    disabled={pending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(a.id, a.name)}
                    disabled={pending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-coral-500/10 hover:text-coral-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {(a.sent_count > 0 || a.scheduled_count > 0 || a.failed_count > 0) && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-ink/10 pt-4">
                  <Metric label="Sent" value={a.sent_count} />
                  {a.scheduled_count > 0 && (
                    <Metric label="Scheduled" value={a.scheduled_count} tone="warn" />
                  )}
                  {a.channel === "email" && (
                    <>
                      <Metric label="Delivered" value={a.delivered_count} tone="good" />
                      <Metric
                        label="Opened"
                        value={
                          <span>
                            {a.opened_count}
                            {a.sent_count > 0 && (
                              <span className="ml-1 text-xs font-normal text-ink-soft/60">
                                {rate}%
                              </span>
                            )}
                          </span>
                        }
                        tone="good"
                      />
                      <Metric label="Not opened" value={a.not_opened_count} tone="muted" />
                    </>
                  )}
                  {a.bounced_count > 0 && (
                    <Metric label="Bounced" value={a.bounced_count} tone="bad" />
                  )}
                  {a.failed_count > 0 && (
                    <Metric label="Failed" value={a.failed_count} tone="bad" />
                  )}
                  {a.channel === "email" && a.sent_count > 0 && (
                    <div className="ml-auto flex min-w-[120px] flex-1 items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <div
                          className="h-full rounded-full bg-forest-500 transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(a.sent_count > 0 || a.scheduled_count > 0) && (
                <button
                  type="button"
                  onClick={() => toggleDeliveries(a.id)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isExpanded ? "Hide" : "Show"} recipients
                </button>
              )}

              {isExpanded && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(["all", "sent", "scheduled", "failed"] as DeliveryFilter[]).map(
                      (f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setDeliveryFilter(f)}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium capitalize",
                            deliveryFilter === f
                              ? "bg-forest-600 text-cream"
                              : "bg-ink/10 text-ink-soft hover:bg-ink/15",
                          )}
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-ink/10">
                    {loadingDeliveries ? (
                      <p className="p-4 text-sm text-ink-soft">Loading…</p>
                    ) : filteredDeliveries.length > 0 ? (
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
                          {filteredDeliveries.map((d) => (
                            <tr
                              key={d.id}
                              className="border-b border-ink/5 last:border-0"
                            >
                              <td className="px-4 py-2 font-mono text-xs">{d.email}</td>
                              <td className="px-4 py-2">
                                <DeliveryStatusBadge
                                  status={
                                    d.opened_at
                                      ? "opened"
                                      : d.recipient_status ?? d.status
                                  }
                                />
                              </td>
                              <td className="px-4 py-2 text-xs text-ink-soft">
                                {d.status === "scheduled" && d.scheduled_for
                                  ? `scheduled ${formatDate(d.scheduled_for, "en")}`
                                  : formatDate(d.sent_at, "en")}
                              </td>
                              <td className="px-4 py-2 text-xs text-ink-soft">
                                {d.opened_at ? formatDate(d.opened_at, "en") : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-sm text-ink-soft">No recipients in this filter.</p>
                    )}
                  </div>
                </div>
              )}

              {canResend && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cream-2/50 px-4 py-3">
                  <p className="text-sm text-ink-soft">
                    <MailOpen className="mr-1.5 inline h-4 w-4 text-coral-500" />
                    <strong>{a.not_opened_count}</strong> valid{" "}
                    {a.not_opened_count === 1 ? "address hasn't" : "addresses haven't"}{" "}
                    opened yet
                    {a.bounced_count > 0 && (
                      <> · {a.bounced_count} bounced (excluded)</>
                    )}
                    . Resend creates a one-off campaign under Campaigns.
                  </p>
                  <button
                    type="button"
                    onClick={() => resend(a)}
                    disabled={pending}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-coral-500 px-4 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
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
          })
        )}
      </div>
    </div>
  );
}
