"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Save, X, Check } from "lucide-react";
import type { Automation, AutomationChannel, AutomationTrigger, Segment } from "@/lib/supabase/types";
import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/app/(admin)/admin/actions";
import { SegmentChecklist } from "@/components/admin/segment-checklist";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

const TRIGGER_OPTIONS: { value: AutomationTrigger; label: string; hint: string }[] = [
  {
    value: "registration",
    label: "Website signup",
    hint: "Popup, lead form — usually for new subscribers only.",
  },
  {
    value: "purchase",
    label: "After purchase",
    hint: 'When /api/subscribe is called with source "purchase".',
  },
  {
    value: "new_subscriber",
    label: "Any new subscriber",
    hint: "Manual add, import, or signup — first time this email appears.",
  },
];

type AutomationRow = Automation & { sent_count: number };

const EMPTY_FORM = {
  name: "",
  channel: "email" as AutomationChannel,
  trigger_event: "registration" as AutomationTrigger,
  enabled: false,
  segment_keys: [] as string[],
  new_subscribers_only: true,
  after_automation_id: "" as string,
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

  const triggerMeta = TRIGGER_OPTIONS.find((t) => t.value === form.trigger_event);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft max-w-2xl">
          Create email or SMS rules that run automatically. Filter by segment, new
          subscribers only, or chain after another automation was already sent.
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
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Welcome — weight loss segment"
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
              <Field label="Order" hint="Lower runs first when several match.">
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
              <p className="text-sm text-ink-soft">{triggerMeta.hint}</p>
            )}

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              Enabled — send automatically when conditions match
            </label>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.new_subscribers_only}
                onChange={(e) =>
                  setForm({ ...form, new_subscribers_only: e.target.checked })
                }
              />
              New subscribers only (skip if email already existed)
            </label>

            <Field
              label="Segments (optional)"
              hint="Leave empty = any segment. Subscriber must have at least one ticked segment."
            >
              <SegmentChecklist
                segments={segments}
                selected={form.segment_keys}
                onChange={(segment_keys) => setForm({ ...form, segment_keys })}
                disabled={pending}
              />
            </Field>

            <Field
              label="Send only after automation"
              hint="Optional — subscriber must have received the chosen automation first (e.g. welcome → follow-up)."
            >
              <Select
                value={form.after_automation_id}
                onChange={(e) =>
                  setForm({ ...form, after_automation_id: e.target.value })
                }
              >
                <option value="">— No prerequisite —</option>
                {otherAutomations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.channel})
                  </option>
                ))}
              </Select>
            </Field>

            {form.channel === "email" ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-ink/10 p-4">
                  <p className="font-medium">Български</p>
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
                <Field label="SMS — Български" hint="{{name}}, {{email}}">
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
            No automations yet. Create one to send welcome emails, purchase
            confirmations, or segment-specific SMS.
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
                      {a.enabled ? "On" : "Off"}
                    </span>
                    <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs uppercase text-ink-soft">
                      {a.channel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {TRIGGER_OPTIONS.find((t) => t.value === a.trigger_event)?.label}
                    {a.segment_keys.length > 0 &&
                      ` · segments: ${a.segment_keys.join(", ")}`}
                    {a.new_subscribers_only && " · new only"}
                    {a.after_automation_id &&
                      ` · after: ${
                        automations.find((x) => x.id === a.after_automation_id)?.name ??
                        "…"
                      }`}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft/70">
                    Sent {a.sent_count} time{a.sent_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-1">
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
