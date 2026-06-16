"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Save, X, Check } from "lucide-react";
import type { Automation, AutomationChannel, AutomationTrigger, Segment } from "@/lib/supabase/types";
import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationEnabled,
} from "@/app/(admin)/admin/actions";
import { SegmentChecklist } from "@/components/admin/segment-checklist";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
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

type AutomationRow = Automation & { sent_count: number };

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

  const triggerMeta = TRIGGER_OPTIONS.find((t) => t.value === form.trigger_event);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft max-w-2xl">
          Automatic emails or SMS on new subscribers, purchases, or on a delay.
          By default they go to new subscribers only — once per email, no
          duplicates.
        </p>
        <button
          type="button"
          onClick={openNew}
          disabled={pending || editingId !== null}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-5 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> New automation
        </button>
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
          automations.map((a) => (
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
                  <p className="mt-0.5 text-xs text-ink-soft/70">
                    Sent {a.sent_count} time{a.sent_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-1">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
