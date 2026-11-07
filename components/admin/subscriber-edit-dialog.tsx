"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import type { Segment, SegmentGroup, Subscriber } from "@/lib/supabase/types";
import {
  SegmentAssignChecklist,
  assignableSegments,
  mergeTags,
  parseTagList,
} from "@/components/admin/segment-checklist";
import {
  previewSubscriberAutomations,
  updateSubscriber,
  type SubscriberAutomationPreviewItem,
} from "@/app/(admin)/admin/actions";
import { SubscriberAutomationsConfirm } from "@/components/admin/subscriber-automations-confirm";
import { Field, Input } from "@/components/admin/fields";
import {
  applyHealthSelectionToTags,
  healthSelectionFromTags,
  HEALTH_SEGMENT_LABELS_BG,
  type HealthSelection,
} from "@/lib/site/health-tags";
import { cn } from "@/lib/utils";

/** Older rows only have `name` — prefill the form by splitting it once. */
function subscriberNameParts(s: Subscriber): { first: string; last: string } {
  if (s.first_name || s.last_name) {
    return { first: s.first_name ?? "", last: s.last_name ?? "" };
  }
  const [first = "", ...rest] = (s.name ?? "").trim().split(/\s+/);
  return { first, last: rest.join(" ") };
}

function quoted(names: string[]): string {
  return names.map((n) => `„${n}“`).join(", ");
}

/** The note after a save that ran the automations. */
function automationOutcomeNote({ started, failed }: { started: string[]; failed: string[] }): string {
  const parts: string[] = [];
  if (started.length > 0) parts.push(`Пуснати: ${quoted(started)}.`);
  if (failed.length > 0) parts.push(`Неуспешни: ${quoted(failed)} - виж историята на автоматизацията.`);
  return parts.length > 0 ? parts.join(" ") : "Не тръгна нито една автоматизация.";
}

/**
 * Name, health answer and groups of one person. Saving asks first when the
 * new groups would start automations, and names them.
 */
export function SubscriberEditDialog({
  subscriber,
  segments,
  groups,
  customTagOptions,
  onClose,
  onSaved,
}: {
  subscriber: Subscriber;
  segments: Segment[];
  groups: SegmentGroup[];
  /** Tags already used on other people that are not a catalog group. */
  customTagOptions: string[];
  onClose: () => void;
  onSaved: (note: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const segmentKeySet = useMemo(
    () => new Set(assignableSegments(segments).map((s) => s.key)),
    [segments],
  );
  const known = useMemo(
    () => new Set([...segmentKeySet, ...customTagOptions]),
    [segmentKeySet, customTagOptions],
  );
  const names = subscriberNameParts(subscriber);
  const [firstName, setFirstName] = useState(names.first);
  const [lastName, setLastName] = useState(names.last);
  const [health, setHealth] = useState<HealthSelection>(() =>
    healthSelectionFromTags(subscriber.tags),
  );
  const [tagKeys, setTagKeys] = useState<string[]>(() =>
    subscriber.tags.filter((t) => known.has(t)),
  );
  const [extraTags, setExtraTags] = useState(() =>
    subscriber.tags.filter((t) => !known.has(t)).join(", "),
  );
  const [error, setError] = useState<string | null>(null);
  const [automationConfirm, setAutomationConfirm] = useState<{
    tags: string[];
    automations: SubscriberAutomationPreviewItem[];
    checkError: string | null;
  } | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending && !automationConfirm) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, automationConfirm, onClose]);

  async function persist(tags: string[], startAutomations: boolean, note: string) {
    const res = await updateSubscriber({
      id: subscriber.id,
      first_name: firstName,
      last_name: lastName,
      tags,
      startAutomations,
    });
    setAutomationConfirm(null);
    if (!res.ok) {
      setError(res.message || "Записът не успя.");
      return;
    }
    // What the run actually did, read back after it — not what the preview expected.
    const outcome = res.automations ? automationOutcomeNote(res.automations) : note;
    onSaved(`Запазено: ${subscriber.email}. ${outcome}`.trim());
  }

  function save() {
    const tags = applyHealthSelectionToTags(mergeTags(tagKeys, parseTagList(extraTags)), health);
    setError(null);

    const before = new Set(subscriber.tags.map((t) => t.trim()).filter(Boolean));
    const after = new Set(tags.map((t) => t.trim()).filter(Boolean));
    const tagsChanged = before.size !== after.size || [...after].some((t) => !before.has(t));

    startTransition(async () => {
      if (!tagsChanged) {
        await persist(tags, false, "");
        return;
      }
      let preview: Awaited<ReturnType<typeof previewSubscriberAutomations>>;
      try {
        preview = await previewSubscriberAutomations({ id: subscriber.id, tags });
      } catch (err) {
        preview = {
          ok: false,
          message: err instanceof Error ? err.message : "неизвестна грешка",
        };
      }
      if (preview.ok && preview.automations.length === 0) {
        await persist(tags, false, "Не тръгват автоматизации.");
        return;
      }
      setAutomationConfirm({
        tags,
        automations: preview.ok ? preview.automations : [],
        checkError: preview.ok ? null : preview.message,
      });
    });
  }

  function confirmAutomations(startAutomations: boolean) {
    if (!automationConfirm) return;
    const { tags } = automationConfirm;
    startTransition(async () => {
      await persist(tags, startAutomations, startAutomations ? "" : "Автоматизациите не са пуснати.");
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] sm:items-center sm:p-4"
        onClick={() => !pending && onClose()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscriber-edit-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
            <div className="min-w-0">
              <h2 id="subscriber-edit-title" className="font-semibold text-ink">
                Име и групи
              </h2>
              <p className="mt-0.5 truncate text-sm text-ink-soft">{subscriber.email}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              aria-label="Затвори"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Име">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field label="Фамилия">
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={pending}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-forest-100 bg-cream/40 p-4">
              <p className="text-sm font-semibold text-ink">Здравна група</p>
              <p className="mt-1 text-xs text-ink-soft">
                Отговорът от формата - диабет, ИР или общо отслабване.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["insulinResistance", HEALTH_SEGMENT_LABELS_BG["insulin-resistance"]],
                    ["diabetes", HEALTH_SEGMENT_LABELS_BG.diabetes],
                    ["general", HEALTH_SEGMENT_LABELS_BG["weight-loss"]],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      health[key]
                        ? "border-gold-500/50 bg-gold-400/15 text-amber-900"
                        : "border-ink/15 bg-white text-ink-soft",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={health[key]}
                      onChange={(e) => setHealth({ ...health, [key]: e.target.checked })}
                      disabled={pending}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Групи">
              <SegmentAssignChecklist
                segments={segments}
                groups={groups}
                selected={tagKeys}
                onChange={setTagKeys}
                disabled={pending}
              />
            </Field>

            {customTagOptions.length > 0 && (
              <Field label="Други етикети">
                <div className="flex flex-wrap gap-2">
                  {customTagOptions.map((tag) => {
                    const active = tagKeys.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setTagKeys(active ? tagKeys.filter((k) => k !== tag) : [...tagKeys, tag])
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm",
                          active
                            ? "border-coral-400 bg-coral-500/10 text-coral-600"
                            : "border-ink/15 text-ink-soft",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            <Field label="Допълнителни етикети" hint="Разделени със запетая.">
              <Input value={extraTags} onChange={(e) => setExtraTags(e.target.value)} />
            </Field>

            {error && <p className="text-sm text-coral-700">{error}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink/10 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-ink-soft hover:bg-ink/5 disabled:opacity-60"
            >
              Откажи
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-60"
            >
              {pending && !automationConfirm && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Запази
            </button>
          </div>
        </div>
      </div>

      {automationConfirm && (
        <SubscriberAutomationsConfirm
          email={subscriber.email}
          automations={automationConfirm.automations}
          checkError={automationConfirm.checkError}
          busy={pending}
          onStart={() => confirmAutomations(true)}
          onSkip={() => confirmAutomations(false)}
          onCancel={() => setAutomationConfirm(null)}
        />
      )}
    </>
  );
}
