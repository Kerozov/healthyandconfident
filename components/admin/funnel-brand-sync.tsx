"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Loader2, Pencil, PlugZap, RefreshCw, Save, X } from "lucide-react";
import {
  previewFunnelBrandSyncAction,
  saveFunnelBrandSettingsAction,
  syncFunnelBrandAction,
  testFunnelBrandAction,
} from "@/app/(admin)/admin/integration-actions";
import { updateSegment } from "@/app/(admin)/admin/actions";
import { Card, Input, Select } from "@/components/admin/fields";
import { AdminButton, Alert, Badge } from "@/components/admin/ui";
import type {
  FunnelBrandPreview,
  FunnelBrandPreviewFunnel,
  FunnelBrandSyncSettings,
  FunnelBrandSyncStatus,
  FunnelSegmentChoice,
  FunnelTagChoice,
} from "@/lib/integrations/funnel-brand-sync";
import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import { formatDateTime } from "@/lib/admin/contact-crm";
import { cn } from "@/lib/utils";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Existing groups, under their segment, for the „свържи с“ pickers. */
function ExistingGroupOptions({
  segments,
  groups,
}: {
  segments: Segment[];
  groups: SegmentGroup[];
}) {
  const byGroup = useMemo(() => {
    const map = new Map<string | null, Segment[]>();
    for (const s of segments) {
      if (s.key === "all") continue;
      const list = map.get(s.group_id) ?? [];
      list.push(s);
      map.set(s.group_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, "bg"));
    return map;
  }, [segments]);

  return (
    <>
      {groups.map((g) =>
        byGroup.get(g.id)?.length ? (
          <optgroup key={g.id} label={`Свържи със съществуваща - ${g.name}`}>
            {byGroup.get(g.id)!.map((s) => (
              <option key={s.key} value={`existing:${s.key}`}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ) : null,
      )}
      {byGroup.get(null)?.length ? (
        <optgroup label="Свържи със съществуваща - без сегмент">
          {byGroup.get(null)!.map((s) => (
            <option key={s.key} value={`existing:${s.key}`}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  );
}

/** Rename an existing group in place — for the ugly names old syncs left behind. */
function RenameGroupInline({ segment }: { segment: Segment }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(segment.name);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const next = name.trim();
    if (!next || next === segment.name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateSegment({ id: segment.id, name: next });
      if (!res.ok) {
        setError(res.message || "Не успях да преименувам.");
        return;
      }
      setError(null);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
        Групата вече я има: <span className="font-medium text-ink">„{segment.name}“</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-forest-700 hover:bg-forest-50"
        >
          <Pencil className="h-3 w-3" aria-hidden /> Преименувай
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Input
          value={name}
          autoFocus
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="!h-9 !py-1.5 text-sm"
          aria-label="Ново име на групата"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          aria-label="Запази името"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-600 text-cream hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          aria-label="Откажи"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-ink/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-coral-700">{error}</p>}
    </div>
  );
}

function segmentChoiceValue(choice: FunnelSegmentChoice): string {
  return choice.mode === "existing" ? `existing:${choice.key}` : choice.mode;
}

function tagChoiceValue(choice: FunnelTagChoice): string {
  return choice.mode === "existing" ? `existing:${choice.key}` : choice.mode;
}

function WebinarRow({
  funnel,
  enabled,
  choice,
  hasSavedChoice,
  segments,
  groups,
  segmentByKey,
  disabled,
  onToggle,
  onChange,
}: {
  funnel: FunnelBrandPreviewFunnel;
  enabled: boolean;
  choice: FunnelSegmentChoice;
  hasSavedChoice: boolean;
  segments: Segment[];
  groups: SegmentGroup[];
  segmentByKey: Map<string, Segment>;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
  onChange: (choice: FunnelSegmentChoice) => void;
}) {
  const sameGroup = segmentByKey.get(funnel.segment);
  return (
    <div
      className={cn(
        "grid gap-3 rounded-2xl border p-4 transition-colors md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]",
        enabled ? "border-ink/10 bg-white" : "border-dashed border-ink/15 bg-cream/40",
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-ink/20"
        />
        <span className="min-w-0">
          <span className={cn("block font-semibold", enabled ? "text-ink" : "text-ink-soft")}>
            {funnel.name}
          </span>
          <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Badge tone={funnel.incoming > 0 ? "forest" : "neutral"}>
              {plural(funnel.incoming, "контакт сега", "контакта сега")}
            </Badge>
            {funnel.newPeople > 0 && (
              <Badge tone="success">{plural(funnel.newPeople, "нов", "нови")}</Badge>
            )}
            <span className="self-center text-ink-soft">
              общо {funnel.contacts} в Launchify
            </span>
            {!hasSavedChoice && enabled && (
              <Badge tone="warning">нов уебинар - по подразбиране</Badge>
            )}
          </span>
          {!enabled && (
            <span className="mt-1.5 block text-xs text-ink-soft">
              Изключен - контактите му не се дърпат.
            </span>
          )}
        </span>
      </label>

      {enabled && (
        <div className="space-y-2">
          <Select
            value={segmentChoiceValue(choice)}
            disabled={disabled}
            aria-label={`Група за ${funnel.name}`}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "same") onChange({ mode: "same" });
              else if (value === "custom") onChange({ mode: "custom", name: funnel.name });
              else onChange({ mode: "existing", key: value.slice("existing:".length) });
            }}
          >
            <option value="same">
              {sameGroup ? `Групата „${sameGroup.name}“` : `Нова група „${funnel.name}“`}
            </option>
            <option value="custom">Нова група с друго име…</option>
            <ExistingGroupOptions segments={segments} groups={groups} />
          </Select>
          {choice.mode === "custom" && (
            <Input
              value={choice.name}
              disabled={disabled}
              placeholder="Име на новата група"
              onChange={(e) => onChange({ mode: "custom", name: e.target.value })}
            />
          )}
          {choice.mode === "same" && sameGroup && <RenameGroupInline segment={sameGroup} />}
          {choice.mode === "existing" && segmentByKey.get(choice.key) && (
            <p className="text-xs text-ink-soft">
              Хората отиват в съществуващата група - нова не се създава.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function FunnelBrandSync({
  status,
  segments,
  groups,
}: {
  status: FunnelBrandSyncStatus;
  segments: Segment[];
  groups: SegmentGroup[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"test" | "preview" | "sync" | "save" | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<FunnelBrandPreview | null>(null);
  const [settings, setSettings] = useState<FunnelBrandSyncSettings>(status.settings);

  const segmentByKey = useMemo(() => new Map(segments.map((s) => [s.key, s])), [segments]);
  const assignable = useMemo(() => segments.filter((s) => s.key !== "all"), [segments]);

  function choiceFor(segment: string): FunnelSegmentChoice {
    const choice = settings.routing[segment];
    // A group deleted since the last sync falls back to the default.
    if (choice && !(choice.mode === "existing" && !segmentByKey.has(choice.key))) return choice;
    const fallback = settings.defaultChoice;
    if (fallback.mode === "existing" && !segmentByKey.has(fallback.key)) return { mode: "same" };
    return fallback;
  }

  function tagChoiceFor(tag: string): FunnelTagChoice {
    const choice = settings.tagMap[tag];
    if (!choice || (choice.mode === "existing" && !segmentByKey.has(choice.key))) {
      return { mode: "keep" };
    }
    return choice;
  }

  function run(kind: "test" | "preview" | "sync" | "save", task: () => Promise<void>) {
    setBusy(kind);
    setResult(null);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setBusy(null);
      }
    });
  }

  function openPreview(full: boolean) {
    if (
      full &&
      !confirm(
        "Пълната синхронизация чете всички контакти от Launchify отначало.\n\nПродължаване?",
      )
    ) {
      return;
    }
    run("preview", async () => {
      const res = await previewFunnelBrandSyncAction({ full });
      if (!res.ok) {
        setResult(res);
        return;
      }
      setPreview(res.preview);
    });
  }

  /** The settings as they will be saved: every webinar on screen gets an explicit choice. */
  function collectSettings(): FunnelBrandSyncSettings | string {
    const next: FunnelBrandSyncSettings = {
      ...settings,
      routing: { ...settings.routing },
      tagMap: { ...settings.tagMap },
    };
    for (const funnel of preview?.funnels ?? []) {
      if (next.disabledFunnels.includes(funnel.segment)) continue;
      const choice = choiceFor(funnel.segment);
      if (choice.mode === "custom" && !choice.name.trim()) {
        return `Въведи име на групата за „${funnel.name}“.`;
      }
      next.routing[funnel.segment] = choice;
    }
    for (const tag of preview?.otherTags ?? []) {
      const choice = tagChoiceFor(tag.tag);
      if (choice.mode === "custom" && !choice.name.trim()) {
        return `Въведи ново име за „${tag.tag}“.`;
      }
      next.tagMap[tag.tag] = choice;
    }
    if (next.alsoAddKey && !segmentByKey.has(next.alsoAddKey)) next.alsoAddKey = null;
    if (next.newGroupParentId && !groups.some((g) => g.id === next.newGroupParentId)) {
      next.newGroupParentId = null;
    }
    return next;
  }

  function saveOnly() {
    const next = collectSettings();
    if (typeof next === "string") {
      setResult({ ok: false, message: next });
      return;
    }
    run("save", async () => {
      const res = await saveFunnelBrandSettingsAction(next);
      setSettings(next);
      setResult(res);
      router.refresh();
    });
  }

  function startSync() {
    const next = collectSettings();
    if (typeof next === "string") {
      setResult({ ok: false, message: next });
      return;
    }
    const full = preview?.full ?? false;
    run("sync", async () => {
      const res = await syncFunnelBrandAction({ full, settings: next });
      setSettings(next);
      setResult({ ok: res.ok, message: res.message });
      setPreview(null);
      router.refresh();
    });
  }

  function test() {
    run("test", async () => {
      setResult(await testFunnelBrandAction());
    });
  }

  const enabledFunnels =
    preview?.funnels.filter((f) => !settings.disabledFunnels.includes(f.segment)) ?? [];
  const offFunnels =
    preview?.funnels.filter((f) => settings.disabledFunnels.includes(f.segment)) ?? [];
  // Totals, not a sum of the rows: a contact without a webinar still comes in.
  const enabledIncoming =
    (preview?.totalIncoming ?? 0) - offFunnels.reduce((sum, f) => sum + f.incoming, 0);
  const enabledNew =
    (preview?.totalNew ?? 0) - offFunnels.reduce((sum, f) => sum + f.newPeople, 0);

  return (
    <div className="space-y-6">
      <Card
        title="Launchify - синхронизация на контакти"
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="secondary" size="sm" onClick={test} disabled={pending}>
              {busy === "test" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlugZap className="h-4 w-4" />
              )}
              Провери връзката
            </AdminButton>
            <AdminButton
              size="sm"
              onClick={() => openPreview(false)}
              disabled={pending || !status.configured || preview !== null}
            >
              {busy === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Виж какво идва
            </AdminButton>
          </div>
        }
      >
        <div className="space-y-5 text-sm text-ink-soft">
          <p className="max-w-3xl leading-relaxed">
            Дърпа хората от уебинарите в Launchify. Първо виждаш какво идва и от кой уебинар,
            избираш в коя група отиват и какво става с етикетите, които идват с тях - после
            пускаш. Автоматизации не тръгват, за да не отидат имейли до всички наведнъж.
          </p>
          <p className="max-w-3xl leading-relaxed">
            Върви и сама, всяка вечер около 22:00, с последно записания избор. Който получи
            нова група, губи чакащите писма от автоматизации, които я изключват - записалият
            се за уебинара не получава още покани да се запише.
          </p>

          {!status.configured && (
            <Alert variant="warning">
              Липсва <code>FUNNEL_BRAND_API_KEY</code>. Създай ключ в Launchify → уебинара →
              Контакти → Синхронизация и го добави в env на сайта заедно с{" "}
              <code>FUNNEL_BRAND_API_URL</code>.
            </Alert>
          )}

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Последно", status.lastRunAt ? formatDateTime(status.lastRunAt) : "никога"],
              ["Нови", String(status.lastCreated)],
              ["Обновени", String(status.lastUpdated)],
              ["Пропуснати", String(status.lastSkipped)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-cream/60 px-3 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wider">{label}</dt>
                <dd className="mt-0.5 font-medium text-ink [font-variant-numeric:tabular-nums]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {status.lastError && (
            <Alert variant="warning">Последна грешка: {status.lastError}</Alert>
          )}
          {result && (
            <Alert variant={result.ok ? "success" : "warning"}>{result.message}</Alert>
          )}

          <p className="text-xs">
            Обикновено се взима само новото от последния път.{" "}
            <button
              type="button"
              onClick={() => openPreview(true)}
              disabled={pending || !status.configured || preview !== null}
              className="font-medium underline underline-offset-2 disabled:opacity-50"
            >
              Пълна синхронизация
            </button>{" "}
            чете всичко отначало - нужна е, ако си включил изключен уебинар или си сменил групите
            на вече внесени хора.
          </p>
        </div>
      </Card>

      <Card title="Правила по подразбиране">
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-ink">Нов уебинар отива в</p>
            <p className="mb-2 mt-0.5 text-xs text-ink-soft">
              За уебинар, за който още не си избрал група.
            </p>
            <Select
              value={
                settings.defaultChoice.mode === "existing"
                  ? `existing:${settings.defaultChoice.key}`
                  : "same"
              }
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                setSettings((prev) => ({
                  ...prev,
                  defaultChoice:
                    v === "same" ? { mode: "same" } : { mode: "existing", key: v.slice(9) },
                }));
              }}
            >
              <option value="same">Нова група с името на уебинара</option>
              <ExistingGroupOptions segments={assignable} groups={groups} />
            </Select>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Новите групи - в сегмент</p>
            <p className="mb-2 mt-0.5 text-xs text-ink-soft">
              Къде се подреждат групите, които синхронизацията създава.
            </p>
            <Select
              value={settings.newGroupParentId ?? ""}
              disabled={pending}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, newGroupParentId: e.target.value || null }))
              }
            >
              <option value="">Без сегмент</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Всички добави и в група</p>
            <p className="mb-2 mt-0.5 text-xs text-ink-soft">
              По избор - една обща група за всеки от Launchify.
            </p>
            <Select
              value={settings.alsoAddKey ? `existing:${settings.alsoAddKey}` : ""}
              disabled={pending}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  alsoAddKey: e.target.value ? e.target.value.slice(9) : null,
                }))
              }
            >
              <option value="">Не</option>
              <ExistingGroupOptions segments={assignable} groups={groups} />
            </Select>
          </div>
        </div>
        {!preview && (
          <div className="mt-5 flex justify-end">
            <AdminButton variant="secondary" size="sm" onClick={saveOnly} disabled={pending}>
              {busy === "save" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Запази правилата
            </AdminButton>
          </div>
        )}
      </Card>

      {preview && (
        <Card
          title={preview.full ? "Пълна синхронизация - какво идва" : "Какво идва сега"}
          className="border-forest-400/40 shadow-card"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-800">
              <span className="font-semibold">
                {plural(enabledIncoming, "контакт", "контакта")} от{" "}
                {plural(enabledFunnels.length, "уебинар", "уебинара")}
              </span>
              <span>·</span>
              <span>{plural(enabledNew, "нов човек", "нови хора")}</span>
              <span>·</span>
              <span>
                {preview.since
                  ? `от ${formatDateTime(preview.since)} насам`
                  : "целият списък"}
              </span>
            </div>

            <section>
              <h3 className="font-display text-base font-semibold text-ink">
                Уебинари - от кои да дойдат и в коя група
              </h3>
              <p className="mb-3 mt-0.5 text-xs text-ink-soft">
                Махни отметката, ако не искаш хората от даден уебинар. Изборът се запомня.
              </p>
              {preview.funnels.length === 0 ? (
                <p className="text-sm text-ink-soft">Ключът няма достъп до нито един уебинар.</p>
              ) : (
                <div className="space-y-2.5">
                  {preview.funnels.map((funnel) => (
                    <WebinarRow
                      key={funnel.id}
                      funnel={funnel}
                      enabled={!settings.disabledFunnels.includes(funnel.segment)}
                      choice={choiceFor(funnel.segment)}
                      hasSavedChoice={Boolean(settings.routing[funnel.segment])}
                      segments={assignable}
                      groups={groups}
                      segmentByKey={segmentByKey}
                      disabled={pending}
                      onToggle={(on) =>
                        setSettings((prev) => ({
                          ...prev,
                          disabledFunnels: on
                            ? prev.disabledFunnels.filter((s) => s !== funnel.segment)
                            : [...new Set([...prev.disabledFunnels, funnel.segment])],
                        }))
                      }
                      onChange={(choice) =>
                        setSettings((prev) => ({
                          ...prev,
                          routing: { ...prev.routing, [funnel.segment]: choice },
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {preview.otherTags.length > 0 && (
              <section>
                <h3 className="font-display text-base font-semibold text-ink">
                  Други групи, които идват от Launchify
                </h3>
                <p className="mb-3 mt-0.5 text-xs text-ink-soft">
                  Етикети, които Launchify слага на хората освен уебинара. Запази ги, дай им
                  друго име, свържи ги със своя група или не ги добавяй.
                </p>
                <div className="overflow-hidden rounded-2xl border border-ink/10">
                  {preview.otherTags.map((tag, i) => {
                    const choice = tagChoiceFor(tag.tag);
                    const existing = segmentByKey.get(tag.tag);
                    return (
                      <div
                        key={tag.tag}
                        className={cn(
                          "grid gap-2 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:items-start",
                          i > 0 && "border-t border-ink/5",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {existing?.name ?? tag.tag}
                          </p>
                          <p className="text-xs text-ink-soft">
                            <code>{tag.tag}</code> · {plural(tag.count, "човек", "души")}
                            {existing ? "" : " · още я няма при теб"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Select
                            value={tagChoiceValue(choice)}
                            disabled={pending}
                            aria-label={`Какво да стане с ${tag.tag}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              const nextChoice: FunnelTagChoice =
                                v === "keep"
                                  ? { mode: "keep" }
                                  : v === "skip"
                                    ? { mode: "skip" }
                                    : v === "custom"
                                      ? { mode: "custom", name: "" }
                                      : { mode: "existing", key: v.slice(9) };
                              setSettings((prev) => ({
                                ...prev,
                                tagMap: { ...prev.tagMap, [tag.tag]: nextChoice },
                              }));
                            }}
                          >
                            <option value="keep">
                              {existing ? `Запази в „${existing.name}“` : "Запази както е"}
                            </option>
                            <option value="custom">Нова група с друго име…</option>
                            <option value="skip">Не я добавяй</option>
                            <ExistingGroupOptions segments={assignable} groups={groups} />
                          </Select>
                          {choice.mode === "custom" && (
                            <Input
                              value={choice.name}
                              disabled={pending}
                              placeholder="Ново име"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  tagMap: {
                                    ...prev.tagMap,
                                    [tag.tag]: { mode: "custom", name: e.target.value },
                                  },
                                }))
                              }
                            />
                          )}
                          {choice.mode === "keep" && existing && (
                            <RenameGroupInline segment={existing} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-ink/10 pt-5 sm:flex-row sm:justify-end">
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => setPreview(null)}
                disabled={pending}
              >
                Отказ
              </AdminButton>
              <AdminButton variant="secondary" size="sm" onClick={saveOnly} disabled={pending}>
                {busy === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Само запази изборите
              </AdminButton>
              <AdminButton size="sm" onClick={startSync} disabled={pending || enabledIncoming === 0}>
                {busy === "sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Синхронизирай {enabledIncoming > 0 ? plural(enabledIncoming, "контакт", "контакта") : ""}
              </AdminButton>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
