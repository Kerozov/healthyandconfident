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
import { EmailTemplatePreview } from "@/components/admin/email-template-preview";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ScheduleMode = "immediate" | "delay" | "fixed";

function getScheduleMode(form: {
  delay_days: number;
  send_date: string;
}): ScheduleMode {
  if (form.send_date.trim()) return "fixed";
  if (form.delay_days > 0) return "delay";
  return "immediate";
}

function buildSchedulePreview(
  form: {
    delay_days: number;
    send_time: string;
    send_date: string;
    after_automation_id: string;
    new_subscribers_only: boolean;
  },
  triggerLabel: string,
  afterName?: string,
): string {
  const time = form.send_time || "09:00";
  const audience = form.new_subscribers_only
    ? "само при първо добавяне на имейла"
    : "при нов и съществуващ имейл в списъка";

  let when: string;
  if (form.send_date.trim()) {
    when = `на ${form.send_date} в ${time} (София)`;
  } else if (form.delay_days > 0) {
    const days =
      form.delay_days === 1 ? "1 ден" : `${form.delay_days} дни`;
    when = `след ${days} в ${time} (София)`;
  } else {
    when = `веднага, или днес в ${time} ако часът още не е минал`;
  }

  if (afterName) {
    return `След като „${afterName}" е изпратена → ${when}. Получатели: ${audience}.`;
  }

  return `При „${triggerLabel}" → ${when}. Получатели: ${audience}.`;
}

function scheduleSummary(a: Automation, automations: AutomationRow[]): string {
  const time = a.send_time || "09:00";
  const after = a.after_automation_id
    ? automations.find((x) => x.id === a.after_automation_id)?.name
    : null;

  let when: string;
  if (a.send_date) {
    when = `${a.send_date} в ${time}`;
  } else if ((a.delay_days ?? 0) > 0) {
    when = `+${a.delay_days} дн. в ${time}`;
  } else {
    when = `веднага / днес ${time}`;
  }

  if (after) return `След „${after}" → ${when}`;
  return when;
}

const TRIGGER_OPTIONS: {
  value: AutomationTrigger;
  label: string;
  hint: string;
}[] = [
  {
    value: "new_subscriber",
    label: "Нов абонат",
    hint: "Когато имейлът влезе в списъка за първи път — сайт, ръчно добавяне или импорт.",
  },
  {
    value: "registration",
    label: "Записване от сайта",
    hint: "Само popup или форма на сайта (не ръчно добавяне в админа).",
  },
  {
    value: "purchase",
    label: "След покупка",
    hint: 'Когато системата получи събитие за покупка (source: "purchase").',
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
  return newOnly ? "само нови" : "нови + стари";
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
  send_time: "09:00",
  send_date: "",
  subject_bg: "",
  html_bg: "",
  cta_label_bg: "",
  cta_url_bg: "",
  subject_en: "",
  html_en: "",
  cta_label_en: "",
  cta_url_en: "",
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
    send_time: a.send_time ?? "09:00",
    send_date: a.send_date ?? "",
    subject_bg: a.subject_bg,
    html_bg: a.html_bg,
    cta_label_bg: a.cta_label_bg ?? "",
    cta_url_bg: a.cta_url_bg ?? "",
    subject_en: a.subject_en,
    html_en: a.html_en,
    cta_label_en: a.cta_label_en ?? "",
    cta_url_en: a.cta_url_en ?? "",
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

  const otherAutomations = automations
    .filter((a) => (editingId === "new" ? true : a.id !== editingId))
    .sort((a, b) => a.name.localeCompare(b.name, "bg"));

  const afterAutomationName = form.after_automation_id
    ? otherAutomations.find((a) => a.id === form.after_automation_id)?.name
    : undefined;

  const scheduleMode = getScheduleMode(form);

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
        send_date: form.send_date.trim() || null,
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

  function setScheduleMode(mode: ScheduleMode) {
    if (mode === "immediate") {
      setForm({ ...form, delay_days: 0, send_date: "" });
      return;
    }
    if (mode === "delay") {
      setForm({
        ...form,
        send_date: "",
        delay_days: form.delay_days > 0 ? form.delay_days : 1,
      });
      return;
    }
    setForm({
      ...form,
      delay_days: 0,
      send_date: form.send_date || new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-soft max-w-2xl">
            Автоматични имейли или SMS при нов абонат, покупка или с закъснение.
            По подразбиране се изпращат само веднъж на имейл — без дублиране.
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
        <Card title={editingId === "new" ? "Нова автоматизация" : "Редакция"}>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Име">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Добре дошла — отслабване"
                />
              </Field>
              <Field label="Канал">
                <Select
                  value={form.channel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      channel: e.target.value as AutomationChannel,
                    })
                  }
                >
                  <option value="email">Имейл</option>
                  <option value="sms">SMS</option>
                </Select>
              </Field>
              <Field label="Защо се пуска (събитие)">
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
              <Field label="Ред" hint="По-малко число = по-рано, ако няколко съвпадат.">
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
                label="Статус"
                hint={
                  form.enabled
                    ? "Активна — ще се изпраща при съвпадение."
                    : "Изключена — нищо не се изпраща."
                }
                value={form.enabled}
                onChange={(enabled) => setForm({ ...form, enabled })}
                options={{ trueLabel: "Включена", falseLabel: "Изключена" }}
                disabled={pending}
              />
              <TogglePair
                label="Кой получава"
                hint={
                  form.new_subscribers_only
                    ? "Само първият път, когато имейлът влезе в списъка. Препоръчително за welcome серия."
                    : "И нови, и вече записани имейли (рядко — може да дублира)."
                }
                value={form.new_subscribers_only}
                onChange={(new_subscribers_only) =>
                  setForm({ ...form, new_subscribers_only })
                }
                options={{
                  trueLabel: "Само нови",
                  falseLabel: "Нови + стари",
                }}
                disabled={pending}
              />
            </div>

            <Field
              label="Сегменти (по избор)"
              hint="Празно = всички. Абонатът трябва да е в поне един избран сегмент."
            >
              <SegmentChecklist
                segments={segments}
                selected={form.segment_keys}
                onChange={(segment_keys) => setForm({ ...form, segment_keys })}
                disabled={pending}
              />
            </Field>

            <div className="rounded-2xl border border-ink/10 bg-cream-2/40 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Верига (по избор)</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Използвай, ако това е 2-ри, 3-ти имейл в серия — след друг
                  автоматизиран имейл/SMS.
                </p>
              </div>
              <Field
                label="След коя автоматизация"
                hint={
                  otherAutomations.length === 0
                    ? "Няма други автоматизации — първо създай и запази първия имейл в серията."
                    : "Празно = стартира от събитието горе. С избор = чака предишната да е изпратена."
                }
              >
                <Select
                  value={form.after_automation_id}
                  onChange={(e) =>
                    setForm({ ...form, after_automation_id: e.target.value })
                  }
                >
                  <option value="">— Без верига (директно от събитието) —</option>
                  {otherAutomations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.channel === "email" ? "имейл" : "SMS"}
                      {a.enabled ? "" : ", изкл."})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="rounded-2xl border border-forest-500/20 bg-forest-50/40 p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold">Кога точно се изпраща</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {form.after_automation_id
                    ? "Закъснението се брои от момента, в който предишната автоматизация е изпратена."
                    : "Закъснението се брои от момента на събитието (нов абонат, покупка и т.н.)."}
                </p>
              </div>

              <div className="inline-flex flex-wrap gap-2 rounded-xl border border-ink/15 bg-white p-1">
                {(
                  [
                    ["immediate", "Веднага"],
                    ["delay", "След дни"],
                    ["fixed", "На дата"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setScheduleMode(mode)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                      scheduleMode === mode
                        ? "bg-forest-600 text-cream shadow-sm"
                        : "text-ink-soft hover:bg-ink/5",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {scheduleMode === "delay" && (
                <Field
                  label="Колко дни след това"
                  hint="Напр. 2 = втори ден след събитието (или след предишния имейл във веригата)."
                >
                  <Input
                    type="number"
                    min={1}
                    value={form.delay_days}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        delay_days: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </Field>
              )}

              {scheduleMode === "fixed" && (
                <Field
                  label="Точна дата"
                  hint="Всички нови абонати получават имейла на тази дата — удобно за напомняне за събитие."
                >
                  <Input
                    type="date"
                    value={form.send_date}
                    onChange={(e) => setForm({ ...form, send_date: e.target.value })}
                  />
                </Field>
              )}

              <Field
                label="Час (София)"
                hint={
                  scheduleMode === "immediate"
                    ? "Ако часът вече е минал днес — изпраща се веднага."
                    : "Часът на избрания ден."
                }
              >
                <Input
                  type="time"
                  value={form.send_time}
                  onChange={(e) =>
                    setForm({ ...form, send_time: e.target.value || "09:00" })
                  }
                />
              </Field>

              <div className="rounded-xl bg-white/80 px-4 py-3 text-sm text-ink">
                <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
                  Обобщение
                </p>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  {buildSchedulePreview(
                    form,
                    triggerMeta?.label ?? form.trigger_event,
                    afterAutomationName,
                  )}
                </p>
              </div>
            </div>

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
                  <Field label="Съдържание" hint="{{name}}, {{email}} — header/footer автоматично">
                    <Textarea
                      rows={6}
                      className="font-mono text-[13px]"
                      value={form.html_bg}
                      onChange={(e) =>
                        setForm({ ...form, html_bg: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Текст на бутона (по избор)">
                    <Input
                      value={form.cta_label_bg}
                      onChange={(e) =>
                        setForm({ ...form, cta_label_bg: e.target.value })
                      }
                      placeholder="Запиши безплатен разговор"
                    />
                  </Field>
                  <Field label="Линк на бутона (по избор)">
                    <Input
                      type="url"
                      value={form.cta_url_bg}
                      onChange={(e) =>
                        setForm({ ...form, cta_url_bg: e.target.value })
                      }
                      placeholder="https://www.healthyandconfident.co.uk/bg#contact"
                    />
                  </Field>
                  <EmailTemplatePreview
                    bodyHtml={form.html_bg}
                    ctaLabel={form.cta_label_bg}
                    ctaUrl={form.cta_url_bg}
                    locale="bg"
                  />
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
                  <Field label="Content" hint="{{name}}, {{email}} — header/footer added automatically">
                    <Textarea
                      rows={6}
                      className="font-mono text-[13px]"
                      value={form.html_en}
                      onChange={(e) =>
                        setForm({ ...form, html_en: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Button text (optional)">
                    <Input
                      value={form.cta_label_en}
                      onChange={(e) =>
                        setForm({ ...form, cta_label_en: e.target.value })
                      }
                      placeholder="Book a free call"
                    />
                  </Field>
                  <Field label="Button link (optional)">
                    <Input
                      type="url"
                      value={form.cta_url_en}
                      onChange={(e) =>
                        setForm({ ...form, cta_url_en: e.target.value })
                      }
                      placeholder="https://www.healthyandconfident.co.uk/en#contact"
                    />
                  </Field>
                  <EmailTemplatePreview
                    bodyHtml={form.html_en}
                    ctaLabel={form.cta_label_en}
                    ctaUrl={form.cta_url_en}
                    locale="en"
                  />
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
                      ` · сегменти: ${a.segment_keys.join(", ")}`}
                    {` · ${audienceSummary(a.new_subscribers_only)}`}
                  </p>
                  <p className="mt-1 text-sm font-medium text-forest-700">
                    {scheduleSummary(a, automations)}
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
