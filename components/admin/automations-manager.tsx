"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
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
  GitBranch,
  List,
  UserPlus,
  UserMinus,
} from "lucide-react";
import type { FormTemplateRecord } from "@/lib/forms/types";
import type {
  Automation,
  AutomationChannel,
  AutomationDelivery,
  AutomationTrigger,
  AutomationStats,
  Segment,
  SegmentGroup,
  SiteProduct,
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
import { AudienceTargetChecklist } from "@/components/admin/segment-checklist";
import { AutomationFlowView, flattenAutomationsForDisplay, TRIGGER_SECTION_LABELS } from "@/components/admin/automation-flow";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { TabList } from "@/components/admin/ui";
import { EmailTemplatePreview } from "@/components/admin/email-template-preview";
import { EmailEmbedsPanel } from "@/components/admin/email-embeds-panel";
import { PurchaseProductPicker } from "@/components/admin/purchase-product-picker";
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
    delay_minutes: number;
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
    ? "само при първо добавяне"
    : "нови и съществуващи";

  let when: string;
  if (form.send_date.trim()) {
    when = `на ${form.send_date} в ${time}`;
  } else if (form.delay_days > 0) {
    when = `след ${form.delay_days} ${form.delay_days === 1 ? "ден" : "дни"} в ${time}`;
  } else if (form.after_automation_id && form.delay_minutes > 0) {
    when = `след ${form.delay_minutes} мин.`;
  } else if (form.after_automation_id) {
    when = "веднага след предишната";
  } else {
    when = "веднага";
  }

  if (afterName) {
    return `След „${afterName}" → ${when}. ${audience}.`;
  }
  return `При „${triggerLabel}" → ${when}. ${audience}.`;
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
  } else if ((a.delay_minutes ?? 0) > 0) {
    when = `+${a.delay_minutes} мин.`;
  } else {
    when = after ? "веднага след" : "веднага";
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
    hint: "След успешно плащане в Stripe. Задай продукт по-долу и/или сегмент в „Включване“ — при плащане таговете се обновяват и стартира тази верига (дори за вече записани имейли).",
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

function formatAutomationAudienceLine(
  a: Automation,
  groups: SegmentGroup[],
  segments: Segment[],
): string | null {
  const includeParts: string[] = [];
  for (const groupId of a.group_ids ?? []) {
    const group = groups.find((g) => g.id === groupId);
    if (group) includeParts.push(`група: ${group.name}`);
  }
  for (const key of a.segment_keys ?? []) {
    const segment = segments.find((s) => s.key === key);
    includeParts.push(segment?.name ?? key);
  }

  const excludeParts: string[] = [];
  for (const groupId of a.exclude_group_ids ?? []) {
    const group = groups.find((g) => g.id === groupId);
    if (group) excludeParts.push(group.name);
  }
  for (const key of a.exclude_segment_keys ?? []) {
    const segment = segments.find((s) => s.key === key);
    excludeParts.push(segment?.name ?? key);
  }

  if (includeParts.length === 0 && excludeParts.length === 0) return null;

  const logic = a.audience_logic === "all" ? " AND " : " | ";
  const include =
    includeParts.length > 0
      ? includeParts.join(logic)
      : "всички";
  const exclude =
    excludeParts.length > 0 ? ` · без: ${excludeParts.join(", ")}` : "";
  return `${include}${exclude}`;
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
  group_ids: [] as string[],
  audience_logic: "any" as "any" | "all",
  exclude_group_ids: [] as string[],
  exclude_segment_keys: [] as string[],
  purchase_product_ids: [] as string[],
  new_subscribers_only: true,
  after_automation_id: "" as string,
  delay_days: 0,
  delay_minutes: 0,
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
  attachment_path_bg: "",
  attachment_filename_bg: "",
  attachment_path_en: "",
  attachment_filename_en: "",
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
    group_ids: a.group_ids ?? [],
    audience_logic: a.audience_logic === "all" ? "all" : "any",
    exclude_group_ids: a.exclude_group_ids ?? [],
    exclude_segment_keys: a.exclude_segment_keys ?? [],
    purchase_product_ids: a.purchase_product_ids ?? [],
    new_subscribers_only: a.new_subscribers_only,
    after_automation_id: a.after_automation_id ?? "",
    delay_days: a.delay_days ?? 0,
    delay_minutes: a.delay_minutes ?? 0,
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
    attachment_path_bg: a.attachment_path_bg ?? "",
    attachment_filename_bg: a.attachment_filename_bg ?? "",
    attachment_path_en: a.attachment_path_en ?? "",
    attachment_filename_en: a.attachment_filename_en ?? "",
    sms_bg: a.sms_bg,
    sms_en: a.sms_en,
    sort_order: a.sort_order,
  };
}

export function AutomationsManager({
  automations,
  segments,
  groups,
  products,
  forms,
}: {
  automations: AutomationRow[];
  segments: Segment[];
  groups: SegmentGroup[];
  products: SiteProduct[];
  forms: FormTemplateRecord[];
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
  const [viewTab, setViewTab] = useState<"list" | "flow">("flow");
  const [contentLocale, setContentLocale] = useState<"bg" | "en">("bg");
  const editorRef = useRef<HTMLDivElement>(null);

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

  function openNew(channel: AutomationChannel = "email") {
    setEditingId("new");
    setForm({
      ...EMPTY_FORM,
      channel,
      sort_order: (automations.length + 1) * 10,
    });
    setError(null);
    setSaved(false);
  }

  /** New step chained after `parent` — copies trigger, audience, product filter. */
  function openNewAfter(parent: AutomationRow) {
    setViewTab("flow");
    setEditingId("new");
    setContentLocale("bg");
    setForm({
      ...EMPTY_FORM,
      channel: parent.channel,
      trigger_event: parent.trigger_event,
      enabled: false,
      segment_keys: [...(parent.segment_keys ?? [])],
      group_ids: [...(parent.group_ids ?? [])],
      audience_logic: parent.audience_logic === "all" ? "all" : "any",
      exclude_group_ids: [...(parent.exclude_group_ids ?? [])],
      exclude_segment_keys: [...(parent.exclude_segment_keys ?? [])],
      purchase_product_ids: [...(parent.purchase_product_ids ?? [])],
      new_subscribers_only: parent.new_subscribers_only,
      after_automation_id: parent.id,
      delay_days: 0,
      delay_minutes: 15,
      send_time: parent.send_time || "09:00",
      send_date: "",
      name: `${parent.name} — следваща`,
      sort_order: (parent.sort_order ?? 0) + 10,
    });
    setError(null);
    setSaved(false);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openEdit(a: AutomationRow) {
    setEditingId(a.id);
    setForm(automationToForm(a));
    setError(null);
    setSaved(false);
  }

  function openEditFromFlow(a: AutomationRow) {
    setViewTab("flow");
    openEdit(a);
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
        delay_minutes: 0,
        delay_days: form.delay_days > 0 ? form.delay_days : 1,
      });
      return;
    }
    setForm({
      ...form,
      delay_days: 0,
      delay_minutes: 0,
      send_date: form.send_date || new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">
            Автоматични имейли и SMS. Кликни стъпка в схемата за редакция.
          </p>
          {note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAll}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-ink/15 px-3 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="sm:inline">Обнови</span>
          </button>
          <button
            type="button"
            onClick={() => openNew("email")}
            disabled={pending || editingId !== null}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-gold-400 px-4 text-sm font-semibold text-forest-900 hover:bg-gold-500 disabled:opacity-60 sm:flex-none"
          >
            <Plus className="h-4 w-4" /> Имейл
          </button>
          <button
            type="button"
            onClick={() => openNew("sms")}
            disabled={pending || editingId !== null}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-green-300 bg-white px-4 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60 sm:flex-none"
          >
            <Plus className="h-4 w-4" /> SMS
          </button>
        </div>
      </div>

      <TabList
        aria-label="Изглед на автоматизациите"
        active={viewTab}
        onChange={(id) => setViewTab(id as "list" | "flow")}
        tabs={[
          {
            id: "flow",
            label: "Схема",
            icon: <GitBranch className="h-4 w-4" aria-hidden />,
          },
          {
            id: "list",
            label: "Списък",
            icon: <List className="h-4 w-4" aria-hidden />,
          },
        ]}
      />

      <div
        className={cn(
          "grid min-w-0 gap-5",
          editingId &&
            viewTab === "flow" &&
            "2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] 2xl:items-start",
        )}
      >
      {editingId && (
        <div
          ref={editorRef}
          className="min-w-0 scroll-mt-4 2xl:sticky 2xl:top-4 2xl:max-h-[calc(100vh-1.5rem)] 2xl:overflow-y-auto"
        >
        <Card
          className="overflow-hidden !p-4 sm:!p-5"
          title={editingId === "new" ? "Нова автоматизация" : `Редакция: ${form.name || "…"}`}
          action={
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-soft hover:bg-ink/5"
              aria-label="Затвори"
            >
              <X className="h-4 w-4" />
            </button>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Събитие">
                <Select
                  value={form.trigger_event}
                  onChange={(e) => {
                    const trigger_event = e.target.value as AutomationTrigger;
                    setForm({
                      ...form,
                      trigger_event,
                      ...(trigger_event === "purchase"
                        ? { new_subscribers_only: false }
                        : {}),
                    });
                  }}
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ред">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                  }
                />
              </Field>
            </div>

            {form.trigger_event === "purchase" && (
              <div className="rounded-2xl border border-gold-500/30 bg-gold-50/40 p-5 space-y-3">
                <p className="text-sm font-semibold text-ink">При покупка на</p>
                <PurchaseProductPicker
                  products={products}
                  selectedIds={form.purchase_product_ids}
                  onChange={(purchase_product_ids) =>
                    setForm({ ...form, purchase_product_ids })
                  }
                  disabled={pending}
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <TogglePair
                label="Статус"
                value={form.enabled}
                onChange={(enabled) => setForm({ ...form, enabled })}
                options={{ trueLabel: "Включена", falseLabel: "Изкл." }}
                disabled={pending}
              />
              <TogglePair
                label="Кой получава"
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

            <div className="rounded-xl border border-ink/10 bg-white p-3 space-y-3 sm:p-4">
              <p className="text-sm font-semibold text-ink">Аудитория</p>

              <div className="grid gap-3">
                <div className="rounded-xl border border-forest-500/25 bg-forest-50/30 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-forest-600" />
                      <p className="text-sm font-semibold text-forest-800">Включване</p>
                    </div>
                    <div className="inline-flex gap-1 rounded-lg border border-ink/15 bg-white p-0.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setForm({ ...form, audience_logic: "any" })}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-semibold",
                          form.audience_logic !== "all"
                            ? "bg-forest-600 text-cream"
                            : "text-ink-soft",
                        )}
                      >
                        OR
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setForm({ ...form, audience_logic: "all" })}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-semibold",
                          form.audience_logic === "all"
                            ? "bg-forest-600 text-cream"
                            : "text-ink-soft",
                        )}
                      >
                        AND
                      </button>
                    </div>
                  </div>
                  <AudienceTargetChecklist
                    segments={segments}
                    groups={groups}
                    selectedSegmentKeys={form.segment_keys}
                    selectedGroupIds={form.group_ids}
                    onChangeSegments={(segment_keys) => setForm({ ...form, segment_keys })}
                    onChangeGroups={(group_ids) => setForm({ ...form, group_ids })}
                    disabled={pending}
                    variant="include"
                  />
                </div>

                <div className="rounded-xl border border-coral-500/30 bg-coral-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserMinus className="h-4 w-4 text-coral-600" />
                    <p className="text-sm font-semibold text-coral-800">Изключване</p>
                  </div>
                  <AudienceTargetChecklist
                    segments={segments}
                    groups={groups}
                    selectedSegmentKeys={form.exclude_segment_keys}
                    selectedGroupIds={form.exclude_group_ids}
                    onChangeSegments={(exclude_segment_keys) =>
                      setForm({ ...form, exclude_segment_keys })
                    }
                    onChangeGroups={(exclude_group_ids) =>
                      setForm({ ...form, exclude_group_ids })
                    }
                    disabled={pending}
                    variant="exclude"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-forest-500/20 bg-forest-50/40 p-4 space-y-4">
              <Field
                label="След коя стъпка"
                hint="Празно = стартира от събитието. С избор = чака предишната."
              >
                <Select
                  value={form.after_automation_id}
                  onChange={(e) => {
                    const after_automation_id = e.target.value;
                    setForm({
                      ...form,
                      after_automation_id,
                      delay_minutes:
                        after_automation_id && form.delay_minutes === 0
                          ? 15
                          : after_automation_id
                            ? form.delay_minutes
                            : 0,
                    });
                  }}
                >
                  <option value="">— Директно от събитието —</option>
                  {otherAutomations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.enabled ? "" : " (изкл.)"}
                    </option>
                  ))}
                </Select>
              </Field>

              <div>
                <p className="mb-2 text-sm font-medium text-ink">Кога</p>
                <div className="inline-flex flex-wrap gap-1 rounded-xl border border-ink/15 bg-white p-1">
                  {(
                    [
                      ["immediate", form.after_automation_id ? "След предишната" : "Веднага"],
                      ["delay", "След дни"],
                      ["fixed", "На дата"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setScheduleMode(mode)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                        scheduleMode === mode
                          ? "bg-forest-600 text-cream shadow-sm"
                          : "text-ink-soft hover:bg-ink/5",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {scheduleMode === "immediate" && form.after_automation_id ? (
                <Field
                  label="Минути след предишната"
                  hint="Напр. 15 — за да не тръгнат два имейла едновременно."
                >
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={form.delay_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        delay_minutes: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </Field>
              ) : null}

              {scheduleMode === "delay" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Дни">
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
                  <Field label="Час (София)">
                    <Input
                      type="time"
                      value={form.send_time}
                      onChange={(e) =>
                        setForm({ ...form, send_time: e.target.value || "09:00" })
                      }
                    />
                  </Field>
                </div>
              )}

              {scheduleMode === "fixed" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Дата">
                    <Input
                      type="date"
                      value={form.send_date}
                      onChange={(e) =>
                        setForm({ ...form, send_date: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Час (София)">
                    <Input
                      type="time"
                      value={form.send_time}
                      onChange={(e) =>
                        setForm({ ...form, send_time: e.target.value || "09:00" })
                      }
                    />
                  </Field>
                </div>
              )}

              <p className="rounded-xl bg-white/80 px-3 py-2 text-xs leading-relaxed text-ink-soft">
                {buildSchedulePreview(
                  form,
                  triggerMeta?.label ?? form.trigger_event,
                  afterAutomationName,
                )}
              </p>
            </div>

            {form.channel === "email" ? (
              <div className="space-y-3 rounded-xl border border-ink/10 p-3 sm:p-4">
                <div className="inline-flex w-full gap-1 rounded-xl border border-ink/15 bg-cream-2/40 p-1 sm:w-auto">
                  {(
                    [
                      ["bg", "Български"],
                      ["en", "English"],
                    ] as const
                  ).map(([loc, label]) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setContentLocale(loc)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-semibold sm:flex-none",
                        contentLocale === loc
                          ? "bg-forest-600 text-cream"
                          : "text-ink-soft hover:bg-white",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {contentLocale === "bg" ? (
                  <div className="space-y-3">
                    <Field label="Тема">
                      <Input
                        value={form.subject_bg}
                        onChange={(e) =>
                          setForm({ ...form, subject_bg: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Съдържание" hint="{{name}}, {{email}}">
                      <Textarea
                        rows={5}
                        className="font-mono text-[13px]"
                        value={form.html_bg}
                        onChange={(e) =>
                          setForm({ ...form, html_bg: e.target.value })
                        }
                      />
                    </Field>
                    <EmailEmbedsPanel
                      locale="bg"
                      html={form.html_bg}
                      onHtmlChange={(html_bg) => setForm({ ...form, html_bg })}
                      products={products}
                      forms={forms}
                      attachmentPath={form.attachment_path_bg}
                      attachmentFilename={form.attachment_filename_bg}
                      onAttachmentChange={(attachment_path_bg, attachment_filename_bg) =>
                        setForm({ ...form, attachment_path_bg, attachment_filename_bg })
                      }
                      disabled={pending}
                    />
                    <Field label="Бутон (текст)">
                      <Input
                        value={form.cta_label_bg}
                        onChange={(e) =>
                          setForm({ ...form, cta_label_bg: e.target.value })
                        }
                        placeholder="Виж събитията"
                      />
                    </Field>
                    <Field label="Бутон (линк)">
                      <Input
                        value={form.cta_url_bg}
                        onChange={(e) =>
                          setForm({ ...form, cta_url_bg: e.target.value })
                        }
                        placeholder="/bg#events"
                      />
                    </Field>
                    <EmailTemplatePreview
                      bodyHtml={form.html_bg}
                      ctaLabel={form.cta_label_bg}
                      ctaUrl={form.cta_url_bg}
                      locale="bg"
                      products={products}
                      forms={forms}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field label="Subject">
                      <Input
                        value={form.subject_en}
                        onChange={(e) =>
                          setForm({ ...form, subject_en: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Content" hint="{{name}}, {{email}}">
                      <Textarea
                        rows={5}
                        className="font-mono text-[13px]"
                        value={form.html_en}
                        onChange={(e) =>
                          setForm({ ...form, html_en: e.target.value })
                        }
                      />
                    </Field>
                    <EmailEmbedsPanel
                      locale="en"
                      html={form.html_en}
                      onHtmlChange={(html_en) => setForm({ ...form, html_en })}
                      products={products}
                      forms={forms}
                      attachmentPath={form.attachment_path_en}
                      attachmentFilename={form.attachment_filename_en}
                      onAttachmentChange={(attachment_path_en, attachment_filename_en) =>
                        setForm({ ...form, attachment_path_en, attachment_filename_en })
                      }
                      disabled={pending}
                    />
                    <Field label="Button text">
                      <Input
                        value={form.cta_label_en}
                        onChange={(e) =>
                          setForm({ ...form, cta_label_en: e.target.value })
                        }
                        placeholder="Book a free call"
                      />
                    </Field>
                    <Field label="Button link">
                      <Input
                        value={form.cta_url_en}
                        onChange={(e) =>
                          setForm({ ...form, cta_url_en: e.target.value })
                        }
                        placeholder="/en#events"
                      />
                    </Field>
                    <EmailTemplatePreview
                      bodyHtml={form.html_en}
                      ctaLabel={form.cta_label_en}
                      ctaUrl={form.cta_url_en}
                      locale="en"
                      products={products}
                      forms={forms}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="SMS — BG" hint="{{name}}, {{email}}">
                  <Textarea
                    rows={4}
                    value={form.sms_bg}
                    onChange={(e) => setForm({ ...form, sms_bg: e.target.value })}
                  />
                </Field>
                <Field label="SMS — EN" hint="{{name}}, {{email}}">
                  <Textarea
                    rows={4}
                    value={form.sms_en}
                    onChange={(e) => setForm({ ...form, sms_en: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {error && <p className="text-sm text-coral-600">{error}</p>}

            <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
              <button
                type="button"
                onClick={save}
                disabled={pending || !form.name.trim()}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60 sm:flex-none"
              >
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                Запази
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
              >
                Отказ
              </button>
            </div>
          </div>
        </Card>
        </div>
      )}

      <div className={cn("min-w-0 overflow-x-auto", editingId && viewTab === "flow" && "2xl:overflow-visible")}>
      {viewTab === "flow" ? (
        <Card title="Схема" className="min-w-0">
          <AutomationFlowView
            automations={automations}
            groups={groups}
            segments={segments}
            selectedId={editingId !== "new" ? editingId : null}
            onSelectAutomation={openEditFromFlow}
            onAddAfterAutomation={openNewAfter}
          />
        </Card>
      ) : (
      <div className="space-y-3">
        {automations.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center">
            <p className="text-sm text-ink-soft">
              Няма автоматизации. Създай welcome имейл, SMS по сегмент или серия след
              покупка.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => openNew("email")}
                disabled={pending || editingId !== null}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gold-400 px-6 font-semibold text-forest-900 hover:bg-gold-500 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Нова имейл автоматизация
              </button>
              <button
                type="button"
                onClick={() => openNew("sms")}
                disabled={pending || editingId !== null}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-green-300 px-6 font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Нова SMS автоматизация
              </button>
            </div>
          </div>
        ) : (
          (() => {
            const flat = flattenAutomationsForDisplay(automations);
            let lastTrigger: AutomationTrigger | null = null;
            return flat.map(({ automation: a, depth, pathLabel, parentName, trigger }) => {
            const showHeader = trigger !== lastTrigger;
            if (showHeader) lastTrigger = trigger;
            const rate = openRate(a);
            const audienceLine = formatAutomationAudienceLine(a, groups, segments);
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
            <div key={a.id} className="space-y-3">
              {showHeader && (
                <div className="flex items-center gap-2 border-b border-ink/10 pb-2 pt-2 first:pt-0">
                  <GitBranch className="h-4 w-4 text-forest-600" aria-hidden />
                  <h3 className="font-display text-base font-semibold text-ink">
                    {TRIGGER_SECTION_LABELS[trigger]}
                  </h3>
                </div>
              )}
            <div
              className={cn(
                "rounded-2xl border border-ink/10 bg-white p-5",
                depth > 0 && "ml-4 border-l-2 border-l-forest-200 sm:ml-8",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {pathLabel}
                    </span>
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
                  {parentName && (
                    <p className="mt-1 text-xs text-ink-soft">
                      ↳ след „<span className="font-medium text-slate-700">{parentName}</span>"
                    </p>
                  )}
                  <p className="mt-1 text-sm text-ink-soft">
                    {triggerSummary(a)}
                    {audienceLine && ` · ${audienceLine}`}
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
                      {(a.total_clicks ?? 0) > 0 && (
                        <Metric
                          label="Clicks"
                          value={
                            <span>
                              {a.total_clicks}
                              <span className="ml-1 text-xs font-normal text-ink-soft/60">
                                {a.unique_clickers_count} човека
                              </span>
                            </span>
                          }
                          tone="good"
                        />
                      )}
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
                            <th className="px-4 py-2">Clicks</th>
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
                              <td className="px-4 py-2 text-xs font-medium text-forest-700">
                                {d.click_count ?? 0}
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
            </div>
            );
          });
          })()
        )}
      </div>
      )}
      </div>
      </div>
    </div>
  );
}
