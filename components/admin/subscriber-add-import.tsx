"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Upload, Loader2 } from "lucide-react";
import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import {
  SegmentAssignChecklist,
  assignableSegments,
  mergeTags,
  parseTagList,
} from "@/components/admin/segment-checklist";
import { addSubscriber } from "@/app/(admin)/admin/actions";
import { Field, Input, Select, Card } from "@/components/admin/fields";
import {
  downloadImportTemplate,
  parseSubscriberFile,
  MAILERLITE_SEGMENT_GROUP,
  type ImportNewSegment,
  type ImportSegmentUsage,
  type ImportSubscriberRow,
} from "@/lib/admin/import-subscribers";
import { cn, chunkArray } from "@/lib/utils";

/** Adding one person by hand, and importing a spreadsheet. */
export function SubscriberAddImport({
  segments,
  groups,
  subscriberTags = [],
}: {
  segments: Segment[];
  groups: SegmentGroup[];
  subscriberTags?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** Matches IMPORT_BATCH_SIZE on the server. */
  const IMPORT_CLIENT_BATCH = 50;
  const [add, setAdd] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    locale: "bg" as "bg" | "en",
    tagKeys: [] as string[],
    extraTags: "",
  });

  const [importSegments, setImportSegments] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<ImportSubscriberRow[] | null>(
    null,
  );
  const [importSkipped, setImportSkipped] = useState<
    { line: number; reason: string }[]
  >([]);
  const [importSegmentUsage, setImportSegmentUsage] = useState<ImportSegmentUsage[]>([]);
  const [importNewSegments, setImportNewSegments] = useState<ImportNewSegment[]>([]);
  const [importTriggerAutomations, setImportTriggerAutomations] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const segmentKeySet = useMemo(
    () => new Set(assignableSegments(segments).map((s) => s.key)),
    [segments],
  );

  const customTagOptions = useMemo(() => {
    const fromSubs = subscriberTags.filter((t) => !segmentKeySet.has(t) && t !== "all");
    return [...new Set(fromSubs)].sort();
  }, [subscriberTags, segmentKeySet]);

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addSubscriber({
        email: add.email,
        first_name: add.firstName || undefined,
        last_name: add.lastName || undefined,
        phone: add.phone || undefined,
        locale: add.locale,
        tags: mergeTags(add.tagKeys, parseTagList(add.extraTags)),
      });
      if (!res.ok) {
        setError(res.message || "Failed");
        return;
      }
      setAdd({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        locale: "bg",
        tagKeys: [],
        extraTags: "",
      });
      router.refresh();
    });
  }

  async function handleImportFile(file: File | null) {
    setImportNote(null);
    setImportPreview(null);
    setImportSkipped([]);
    setImportSegmentUsage([]);
    setImportNewSegments([]);
    if (!file) return;

    try {
      const parsed = await parseSubscriberFile(file, segments, importSegments);
      setImportPreview(parsed.rows);
      setImportSkipped(parsed.skipped);
      setImportSegmentUsage(parsed.segments);
      setImportNewSegments(parsed.newSegments);
      if (parsed.rows.length === 0) {
        setImportNote(
          parsed.skipped.length
            ? "No valid rows found. Check the file format."
            : "The file is empty.",
        );
      }
    } catch (err) {
      setImportNote(err instanceof Error ? err.message : "Could not read file.");
    }
  }

  /**
   * Posts the parsed rows in batches.
   *
   * A single server action caps the request body at 1 MB, which is what made
   * bigger spreadsheets fail with a "file too large" error. Batching keeps every
   * request small and gives the import a progress bar instead of a long freeze.
   */
  async function runImport() {
    if (!importPreview?.length) return;

    const rows = importPreview;
    const batches = chunkArray(rows, IMPORT_CLIENT_BATCH);

    setImportNote(null);
    setImporting(true);
    setImportProgress({ done: 0, total: rows.length });

    let created = 0;
    let updated = 0;
    let failed = 0;
    let keptUnsubscribed = 0;
    let firstError: string | null = null;
    let processed = 0;

    try {
      for (const batch of batches) {
        const batchKeys = new Set(batch.flatMap((row) => row.segments));
        const res = await fetch("/api/admin/subscribers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: batch,
            mergeSegments: true,
            newSegments: importNewSegments.filter((seed) => batchKeys.has(seed.key)),
            triggerAutomations: importTriggerAutomations,
          }),
        });

        let data: {
          ok?: boolean;
          created?: number;
          updated?: number;
          failed?: number;
          keptUnsubscribed?: number;
          errors?: string[];
          message?: string;
        } = {};
        try {
          data = (await res.json()) as typeof data;
        } catch {
          data = {};
        }

        created += data.created ?? 0;
        updated += data.updated ?? 0;
        failed += data.failed ?? 0;
        keptUnsubscribed += data.keptUnsubscribed ?? 0;
        if (!firstError) firstError = data.errors?.[0] ?? null;

        if (!res.ok || !data.ok) {
          const message =
            data.message ||
            (res.status === 401 || res.status === 403
              ? "Няма достъп / сесията е изтекла. Презареди и влез отново."
              : `Импортът спря (HTTP ${res.status}).`);
          setImportNote(
            `${message} Записани ${created + updated} от ${rows.length} реда - пусни файла отново, за да продължиш.`,
          );
          router.refresh();
          return;
        }

        processed += batch.length;
        setImportProgress({ done: processed, total: rows.length });
      }

      const total = created + updated;
      setImportNote(
        `Импортирани ${total} абонат(а): ${created} нови, ${updated} обновени` +
          (failed ? `, ${failed} с грешка${firstError ? ` (${firstError})` : ""}` : "") +
          "." +
          (keptUnsubscribed
            ? ` ${keptUnsubscribed} вече отписани останаха отписани.`
            : "") +
          (importTriggerAutomations
            ? " Автоматизациите са пуснати."
            : " Автоматизациите не са пуснати."),
      );
      setImportPreview(null);
      setImportSkipped([]);
      setImportSegmentUsage([]);
      setImportNewSegments([]);
      router.refresh();
    } catch (err) {
      setImportNote(
        `${err instanceof Error ? err.message : "Импортът не беше завършен."} Записани ${
          created + updated
        } от ${rows.length} реда.`,
      );
      router.refresh();
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Добави човек ръчно">
        <form onSubmit={submitAdd} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            <div className="md:col-span-2">
              <Field label="Имейл">
                <Input
                  type="email"
                  required
                  value={add.email}
                  onChange={(e) => setAdd({ ...add, email: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Име">
              <Input
                value={add.firstName}
                onChange={(e) => setAdd({ ...add, firstName: e.target.value })}
              />
            </Field>
            <Field label="Фамилия">
              <Input
                value={add.lastName}
                onChange={(e) => setAdd({ ...add, lastName: e.target.value })}
              />
            </Field>
            <Field label="Телефон">
              <Input
                value={add.phone}
                onChange={(e) => setAdd({ ...add, phone: e.target.value })}
                placeholder="0888… или +359…"
              />
            </Field>
            <Field label="Език">
              <Select
                value={add.locale}
                onChange={(e) =>
                  setAdd({ ...add, locale: e.target.value as "bg" | "en" })
                }
              >
                <option value="bg">BG</option>
                <option value="en">EN</option>
              </Select>
            </Field>
          </div>

          <Field label="Групи" hint="Избери една или повече групи.">
            <SegmentAssignChecklist
              segments={segments}
              groups={groups}
              selected={add.tagKeys}
              onChange={(tagKeys) => setAdd({ ...add, tagKeys })}
              disabled={pending}
            />
          </Field>

          {customTagOptions.length > 0 && (
            <Field label="Други етикети" hint="Етикети, които вече има при други хора.">
              <div className="flex flex-wrap gap-2">
                {customTagOptions.map((tag) => {
                  const active = add.tagKeys.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setAdd({
                          ...add,
                          tagKeys: active
                            ? add.tagKeys.filter((k) => k !== tag)
                            : [...add.tagKeys, tag],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        active
                          ? "border-coral-400 bg-coral-500/10 text-coral-600"
                          : "border-ink/15 text-ink-soft"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <Field
            label="Допълнителни етикети"
            hint="Разделени със запетая - етикети, които ги няма горе."
          >
            <Input
              value={add.extraTags}
              onChange={(e) => setAdd({ ...add, extraTags: e.target.value })}
              placeholder="vip, webinar-2026"
            />
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Добави
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-coral-600">{error}</p>}
      </Card>

      <Card title="Импорт от Excel / CSV">
        <p className="mb-4 text-sm text-ink-soft">
          Upload <code className="text-xs">.xlsx</code> or <code className="text-xs">.csv</code>{" "}
          (comma or semicolon). Required: <strong>email</strong> (or{" "}
          <strong>Subscriber</strong> from Mailchimp exports). Optional: name, first_name,
          last_name, phone, facebook_url, locale, status, tags/segments, source, notes, consent,
          created_at. Mailchimp <strong>LOCATION</strong> (e.g. United States) sets locale to{" "}
          <code className="text-xs">en</code> and adds the <code className="text-xs">en</code> tag.
          Големи файлове минават на части - няма ограничение за размера.
        </p>
        <p className="mb-4 text-sm text-ink-soft">
          <strong>MailerLite експорт</strong> (CSV с табулации) се приема директно: всяка
          група от колоната <strong>Groups</strong> (разделени с „;“ или със запетая) се
          слага на човека - съществуващата, ако името съвпада, иначе се създава нова в
          групата „{MAILERLITE_SEGMENT_GROUP}“ (само веднъж, без дубликати). Статусите bounced,
          junk и unconfirmed се внасят като отписани. Допълнителните полета (Проблем,
          Килограми, Company…) отиват в бележките. При повторен файл празните клетки не
          изтриват данни, а отписаните тук не се записват отново.
        </p>

        <Field
          label="Групи по подразбиране"
          hint="Слагат се, когато редът няма колона с групи или тя е празна."
        >
          <SegmentAssignChecklist
            segments={segments}
            groups={groups}
            selected={importSegments}
            onChange={setImportSegments}
            disabled={pending}
          />
        </Field>

        <label
          className={cn(
            "mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-3",
            importTriggerAutomations
              ? "border-coral-300 bg-coral-300/10"
              : "border-ink/10 bg-cream/40",
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={importTriggerAutomations}
            disabled={pending || importing}
            onChange={(e) => setImportTriggerAutomations(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-semibold">Пусни автоматизациите след импорта</span>
            <span className="mt-0.5 block text-xs text-ink-soft">
              {importTriggerAutomations
                ? "Хората влизат в автоматизациите за новите си сегменти и за нови абонати (според настройката „Импорт“/„Нови“ на всяка автоматизация) - ще получат писмата им."
                : "Хората само получават сегментите си - никакви писма от автоматизации. За стари абонати от MailerLite обикновено това е правилното."}
            </span>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5">
            <Upload className="h-4 w-4" />
            Избери файл
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              className="sr-only"
              disabled={pending || importing}
              onChange={(e) => {
                void handleImportFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={downloadImportTemplate}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold hover:bg-ink/5"
          >
            <Download className="h-4 w-4" /> Свали шаблон
          </button>
          {importPreview && importPreview.length > 0 && (
            <button
              type="button"
              onClick={() => void runImport()}
              disabled={pending || importing}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:cursor-wait disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Import {importPreview.length} row{importPreview.length === 1 ? "" : "s"}
              <span className="font-normal opacity-80">
                {importTriggerAutomations ? "· с автоматизации" : "· без автоматизации"}
              </span>
            </button>
          )}
        </div>

        {importProgress && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="flex items-baseline justify-between gap-3 text-sm text-ink-soft">
              <span>Импортиране…</span>
              <span className="[font-variant-numeric:tabular-nums]">
                {importProgress.done} / {importProgress.total}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-forest-100">
              <div
                className="h-full rounded-full bg-forest-600 transition-[width]"
                style={{
                  width: `${Math.round(
                    (importProgress.done / Math.max(1, importProgress.total)) * 100,
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">
              Не затваряй страницата, докато лентата не стигне до края.
            </p>
          </div>
        )}

        {importPreview && importPreview.length > 0 && !importProgress && (
          <p className="mt-3 text-sm text-forest-600">
            Ready: {importPreview.length} subscriber
            {importPreview.length === 1 ? "" : "s"}
            {importSkipped.length > 0 &&
              ` · ${importSkipped.length} row(s) skipped`}
          </p>
        )}
        {importPreview && importPreview.length > 0 && !importProgress &&
          importSegmentUsage.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Сегменти от файла
                {importNewSegments.length > 0 &&
                  ` · ${importNewSegments.length} нови`}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {importSegmentUsage.map((usage) => (
                  <li
                    key={usage.key}
                    title={usage.key}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs",
                      usage.isNew
                        ? "border-coral-300 bg-coral-300/15 text-coral-700"
                        : "border-forest-100 bg-forest-50 text-forest-700",
                    )}
                  >
                    {usage.name}{" "}
                    <span className="[font-variant-numeric:tabular-nums] opacity-70">
                      {usage.count}
                    </span>
                    {usage.isNew && <span className="ml-1 font-semibold">нов</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        {importSkipped.length > 0 && (
          <ul className="mt-2 text-xs text-coral-600">
            {importSkipped.slice(0, 5).map((s) => (
              <li key={`${s.line}-${s.reason}`}>
                Row {s.line}: {s.reason}
              </li>
            ))}
            {importSkipped.length > 5 && (
              <li>…and {importSkipped.length - 5} more</li>
            )}
          </ul>
        )}
        {importNote && (
          <p
            className={`mt-3 text-sm ${importNote.includes("failed") || importNote.includes("No valid") ? "text-coral-600" : "text-forest-600"}`}
          >
            {importNote}
          </p>
        )}
      </Card>
    </div>
  );
}
