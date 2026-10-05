"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send, Users, X } from "lucide-react";
import {
  previewAutomationSendNow,
  sendAutomationNow,
  type SendAutomationNowInput,
} from "@/app/(admin)/admin/actions";
import type { Automation, Segment, SegmentGroup } from "@/lib/supabase/types";
import { AudienceTargetChecklist } from "@/components/admin/segment-checklist";
import { Field, Select } from "@/components/admin/fields";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SEND_PACING_MINUTES,
  SEND_PACING_OPTIONS,
  pacingDurationLabel,
} from "@/lib/automation/send-pacing";

type Mode = SendAutomationNowInput["mode"];

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "emails", label: "Конкретни хора", hint: "Един или няколко имейла" },
  { value: "audience", label: "Група / сегмент", hint: "Абонатите в избраните" },
  { value: "all", label: "Всички абонати", hint: "Целият списък" },
];

type Preview = { total: number; already: number; invalid: string[]; label: string };

/**
 * Sends one step by hand, right now — to a typed person, a group, or everyone.
 * Shows how many people that is (and how many already have it) before sending.
 */
export function AutomationSendNowDialog({
  automation,
  segments,
  groups,
  hasNextSteps,
  onClose,
  onSent,
}: {
  automation: Pick<Automation, "id" | "name" | "channel">;
  segments: Segment[];
  groups: SegmentGroup[];
  hasNextSteps: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [mode, setMode] = useState<Mode>("emails");
  const [emails, setEmails] = useState("");
  const [segmentKeys, setSegmentKeys] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [locale, setLocale] = useState<"" | "bg" | "en">("");
  const [resend, setResend] = useState(false);
  const [continueChain, setContinueChain] = useState(false);
  const [pacing, setPacing] = useState<number>(DEFAULT_SEND_PACING_MINUTES);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message?: string; remaining?: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();
  const [sending, startSending] = useTransition();

  const input: SendAutomationNowInput = {
    mode,
    emails,
    segment_keys: segmentKeys,
    group_ids: groupIds,
    locale,
    resend,
    continueChain,
    spacingMinutes: pacing,
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  /** Any change to who it goes to makes the count stale. */
  function changed() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function check() {
    changed();
    startChecking(async () => {
      const res = await previewAutomationSendNow(automation.id, input);
      if (res.ok) setPreview(res);
      else setError(res.message);
    });
  }

  function send() {
    if (!preview) return;
    const count = resend ? preview.total : preview.total - preview.already;
    const spread = pacingDurationLabel(count, pacing);
    if (
      count > 1 &&
      !confirm(
        `Да изпратя „${automation.name}“ на ${count} души?\n\n` +
          (spread ? `Разпределени във времето — последният тръгва след ${spread}.` : "Всички тръгват наведнъж."),
      )
    ) {
      return;
    }
    setResult(null);
    setError(null);
    startSending(async () => {
      const res = await sendAutomationNow(automation.id, input);
      setResult(res);
      if (res.ok) onSent();
      // The counts changed — a second press should start from a fresh check.
      if (!res.remaining) setPreview(null);
    });
  }

  const toSend = preview ? (resend ? preview.total : preview.total - preview.already) : 0;
  const spread = pacingDurationLabel(toSend, pacing);
  const canCheck =
    mode === "emails"
      ? emails.trim().length > 0
      : mode === "audience"
        ? segmentKeys.length + groupIds.length > 0
        : true;
  const busy = checking || sending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onClick={() => !sending && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-now-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id="send-now-title" className="font-semibold text-ink">
              Изпрати сега
            </h2>
            <p className="mt-0.5 truncate text-sm text-ink-soft">
              {automation.channel === "sms" ? "SMS" : "Имейл"} „{automation.name}“
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Затвори"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  setMode(m.value);
                  changed();
                }}
                disabled={busy}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left transition-colors",
                  mode === m.value
                    ? "border-forest-500 bg-forest-500/10"
                    : "border-ink/15 hover:bg-ink/5",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{m.label}</span>
                <span className="block text-xs text-ink-soft">{m.hint}</span>
              </button>
            ))}
          </div>

          {mode === "emails" && (
            <Field
              label="Имейли"
              hint="Един или повече — на нов ред, със запетая или интервал. Езикът и името се вземат от абоната."
              htmlFor="send-now-emails"
            >
              <textarea
                id="send-now-emails"
                value={emails}
                onChange={(e) => {
                  setEmails(e.target.value);
                  changed();
                }}
                rows={4}
                disabled={busy}
                placeholder={"maria@example.com\nivan@example.com"}
                className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-soft/50 focus:border-forest-400 focus:ring-2 focus:ring-forest-400/20"
              />
            </Field>
          )}

          {mode === "audience" && (
            <AudienceTargetChecklist
              segments={segments}
              groups={groups}
              selectedSegmentKeys={segmentKeys}
              selectedGroupIds={groupIds}
              onChangeSegments={(keys) => {
                setSegmentKeys(keys);
                changed();
              }}
              onChangeGroups={(ids) => {
                setGroupIds(ids);
                changed();
              }}
              disabled={busy}
            />
          )}

          {mode !== "emails" && (
            <Field label="Език" htmlFor="send-now-locale">
              <Select
                id="send-now-locale"
                value={locale}
                onChange={(e) => {
                  setLocale(e.target.value as "" | "bg" | "en");
                  changed();
                }}
                disabled={busy}
              >
                <option value="">Всички (всеки получава своя език)</option>
                <option value="bg">Само български</option>
                <option value="en">Само английски</option>
              </Select>
            </Field>
          )}

          <Field
            label="Темпо"
            hint="За повече от един човек — изпращане едно по едно, за да не тръгне всичко наведнъж."
            htmlFor="send-now-pacing"
          >
            <Select
              id="send-now-pacing"
              value={pacing}
              onChange={(e) => {
                setPacing(Number(e.target.value));
                setResult(null);
              }}
              disabled={busy}
            >
              {SEND_PACING_OPTIONS.map((o) => (
                <option key={o.minutes} value={o.minutes}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={resend}
                onChange={(e) => {
                  setResend(e.target.checked);
                  setResult(null);
                }}
                disabled={busy}
                className="mt-0.5"
              />
              <span>
                Изпрати и на тези, които вече са я получили
                <span className="block text-xs text-ink-soft">
                  Иначе те се пропускат. Ако им е насрочена, насроченото се отменя и тръгва сега.
                </span>
              </span>
            </label>
            {hasNextSteps && (
              <label className="flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={continueChain}
                  onChange={(e) => {
                    setContinueChain(e.target.checked);
                    setResult(null);
                  }}
                  disabled={busy}
                  className="mt-0.5"
                />
                <span>
                  Продължи с следващите стъпки от поредицата
                  <span className="block text-xs text-ink-soft">
                    Насрочва ги от сега, със закъсненията им. Които вече ги имат — не ги получават пак.
                  </span>
                </span>
              </label>
            )}
          </div>

          {preview && (
            <div className="rounded-xl bg-cream-2/50 px-4 py-3 text-sm text-ink">
              <p className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4 text-forest-600" />
                {preview.label}: {preview.total} {preview.total === 1 ? "получател" : "получатели"}
              </p>
              {preview.already > 0 && (
                <p className="mt-1 text-ink-soft">
                  {preview.already} вече я имат —{" "}
                  {resend ? "ще я получат пак." : "ще бъдат пропуснати."}
                </p>
              )}
              {spread && toSend > 1 && (
                <p className="mt-1 text-ink-soft">Последният тръгва след {spread}.</p>
              )}
              {preview.invalid.length > 0 && (
                <p className="mt-1 text-coral-600">
                  Невалидни (пропускат се): {preview.invalid.join(", ")}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-coral-600">{error}</p>}
          {result?.message && (
            <p
              role="status"
              className={cn("text-sm", result.ok ? "text-forest-700" : "text-coral-600")}
            >
              {result.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/10 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="inline-flex h-10 items-center rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            Затвори
          </button>
          {!preview ? (
            <button
              type="button"
              onClick={check}
              disabled={busy || !canCheck}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Провери получателите
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={busy || toSend === 0}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {toSend === 0 ? "Няма на кого" : `Изпрати на ${toSend}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
