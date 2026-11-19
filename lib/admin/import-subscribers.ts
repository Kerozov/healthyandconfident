import * as XLSX from "xlsx";
import type { Locale } from "@/i18n/config";
import {
  applyEnglishRecipientTag,
  inferLocaleFromLocation,
} from "@/i18n/subscriber-locale";
import type { Segment } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils";

/** Columns accepted on import (and written on export). */
export const SUBSCRIBER_SPREADSHEET_COLUMNS = [
  "email",
  "name",
  "first_name",
  "last_name",
  "phone",
  "facebook_url",
  "locale",
  "status",
  "tags",
  "source",
  "notes",
  "consent",
  "created_at",
  "updated_at",
] as const;

/** Segment group that new segments from a MailerLite `Groups` column land in. */
export const MAILERLITE_SEGMENT_GROUP = "MailerLite";

/** A column the subscriber has no field for — stored in `subscriber_facts`. */
export type ImportFact = { label: string; value: string };

export type ImportSubscriberRow = {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  facebook_url?: string;
  locale?: Locale;
  /**
   * True when the file states the language (a locale column or a language group).
   * A guess from the name or location never overrides an existing subscriber.
   */
  locale_explicit?: boolean;
  status?: "subscribed" | "unsubscribed";
  segments: string[];
  source?: string;
  notes?: string;
  consent?: boolean;
  created_at?: string;
  /** Country, kilograms, the problem… — shown under „Информация за човека“. */
  facts?: ImportFact[];
  /** Where the facts came from, e.g. "MailerLite"; empty for a plain file. */
  facts_source?: string;
  /**
   * What the importer used to put into `notes` for this row. Notes made only of
   * these parts are cleared, because the same data now lives in the facts.
   */
  legacy_note_parts?: string[];
};

/** A segment the file assigns that the catalog does not have yet. */
export type ImportNewSegment = {
  key: string;
  name: string;
  group?: string;
};

/** One segment the import will assign, for the preview. */
export type ImportSegmentUsage = {
  key: string;
  name: string;
  isNew: boolean;
  count: number;
};

export type ParsedImport = {
  rows: ImportSubscriberRow[];
  skipped: { line: number; reason: string }[];
  segments: ImportSegmentUsage[];
  newSegments: ImportNewSegment[];
  /** Extra columns and how many people have a value in each — for the preview. */
  facts: { label: string; count: number }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CYRILLIC_RE = /[Ѐ-ӿ]/;

/** MailerLite / Excel prefix `'` to values starting with + - = @ (formula guard). */
function stripFormulaGuard(value: string): string {
  return value.replace(/^'(?=[=+\-@])/, "");
}

function normalizeHeader(key: string): string {
  return stripFormulaGuard(key.trim()).toLowerCase().replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<string, string> = {
  email: "email",
  e_mail: "email",
  email_address: "email",
  mail: "email",
  subscriber: "email",
  абонат: "email",
  name: "name",
  ime: "name",
  first_name: "first_name",
  firstname: "first_name",
  fname: "first_name",
  име: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  lname: "last_name",
  фамилия: "last_name",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  mobile: "phone",
  телефон: "phone",
  facebook: "facebook_url",
  facebook_url: "facebook_url",
  facebook_profile: "facebook_url",
  locale: "locale",
  language: "locale",
  lang: "locale",
  език: "locale",
  status: "status",
  статус: "status",
  segments: "tags",
  segment: "tags",
  tags: "tags",
  tag: "tags",
  сегменти: "tags",
  групи: "tags",
  група: "tags",
  // MailerLite export: group names separated by ";".
  groups: "groups",
  source: "source",
  източник: "source",
  notes: "notes",
  note: "notes",
  бележки: "notes",
  // MailerLite's own guess from the IP address.
  location: "location",
  // Typed by the person — preferred for the „Държава“ fact.
  country: "country",
  държава: "country",
  mailerlite_total_spent: "total_spent",
  total_spent: "total_spent",
  consent: "consent",
  created_at: "created_at",
  created: "created_at",
  subscribed: "created_at",
  subscribed_at: "created_at",
  updated_at: "updated_at",
};

/** Export statistics and system columns — nothing worth keeping on the subscriber. */
const IGNORED_COLUMNS = new Set([
  "id",
  "subscriber_id",
  "sent",
  "opens",
  "clicks",
  "open_rate",
  "click_rate",
  "updated_at",
  "unsubscribed",
  "unsubscribed_at",
  "ip",
  "ip_address",
  "subscribed_ip",
  "opted_in_at",
  "optin_ip",
  "opted_in_ip",
]);

type MappedRow = {
  fields: Record<string, string>;
  /** Columns the app has no field for (MailerLite custom fields) — kept in notes. */
  extras: { label: string; value: string }[];
};

function mapRow(raw: Record<string, unknown>): MappedRow {
  const fields: Record<string, string> = {};
  const extras: MappedRow["extras"] = [];
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(key);
    const next = stripFormulaGuard(
      String(value ?? "").replace(/\s+/g, " ").trim(),
    );
    if (!next || IGNORED_COLUMNS.has(normalized)) continue;

    const field = HEADER_ALIASES[normalized];
    if (!field) {
      extras.push({ label: stripFormulaGuard(key.trim()), value: next });
      continue;
    }
    if (fields[field]) continue;
    fields[field] = next;
  }
  return { fields, extras };
}

function normalizeLabel(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

function segmentSlug(value: string): string {
  return slugify(value).replace(/^-+|-+$/g, "");
}

type ResolvedSegment = { key: string; existing: boolean };

/**
 * Maps a label from the file onto the catalog: by key, by name (case- and
 * space-insensitive), then by transliterated slug of the key or the name — so
 * "Лятна програма" finds `summer-food` and a renamed MailerLite group with the
 * same words still lands on the segment it was imported into before.
 */
function createSegmentResolver(segments: Segment[]) {
  const keys = new Set(segments.map((s) => s.key));
  const byName = new Map<string, string>();
  const byNameSlug = new Map<string, string>();
  for (const segment of segments) {
    byName.set(normalizeLabel(segment.name), segment.key);
    const slug = segmentSlug(segment.name);
    if (slug && !byNameSlug.has(slug)) byNameSlug.set(slug, segment.key);
  }

  return (label: string): ResolvedSegment | null => {
    const part = label.trim();
    if (!part) return null;
    const lower = part.toLowerCase();
    if (keys.has(part)) return { key: part, existing: true };
    if (keys.has(lower)) return { key: lower, existing: true };

    const named = byName.get(normalizeLabel(part));
    if (named) return { key: named, existing: true };

    const slug = segmentSlug(part);
    if (slug && keys.has(slug)) return { key: slug, existing: true };
    const bySlug = slug ? byNameSlug.get(slug) : undefined;
    if (bySlug) return { key: bySlug, existing: true };

    return { key: slug || lower, existing: false };
  };
}

/**
 * Splits a Groups cell. With "," as the separator, neighbouring parts that
 * together name an existing segment ("Октомври, Ноември, Декември 2026") stay
 * one group.
 */
function splitGroupLabels(
  value: string,
  separator: ";" | ",",
  isKnown: (label: string) => boolean,
): string[] {
  const parts = value
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
  if (separator === ";") return parts;

  const labels: string[] = [];
  for (let start = 0; start < parts.length; ) {
    let end = start + 1;
    for (let j = parts.length; j > start + 1; j -= 1) {
      if (isKnown(parts.slice(start, j).join(", "))) {
        end = j;
        break;
      }
    }
    labels.push(parts.slice(start, end).join(", "));
    start = end;
  }
  return labels;
}

export function resolveSegmentTokens(
  value: string,
  segments: Segment[],
): string[] {
  const resolve = createSegmentResolver(segments);
  return value
    .split(/[,|;]/)
    .map((part) => resolve(part)?.key)
    .filter((key): key is string => Boolean(key) && key !== "all");
}

function parseLocale(value: string): Locale | undefined {
  const v = value.toLowerCase();
  if (v === "bg" || v === "bulgarian" || v.startsWith("бг")) return "bg";
  if (v === "en" || v === "english") return "en";
  return undefined;
}

/** Group names that state the subscriber's language. */
const LANGUAGE_GROUPS: Record<string, Locale> = {
  bg: "bg",
  bulgarian: "bg",
  bulgarians: "bg",
  български: "bg",
  българи: "bg",
  en: "en",
  english: "en",
  английски: "en",
};

function localeFromGroups(labels: string[]): Locale | undefined {
  const found = new Set(
    labels
      .map((label) => LANGUAGE_GROUPS[normalizeLabel(label)])
      .filter(Boolean),
  );
  return found.size === 1 ? [...found][0] : undefined;
}

function parseStatus(value: string): "subscribed" | "unsubscribed" | undefined {
  const v = value.toLowerCase();
  if (v === "subscribed" || v === "active" || v === "да" || v === "yes")
    return "subscribed";
  // MailerLite: bounced / junk / unconfirmed; Mailchimp: cleaned. None may be mailed.
  if (
    v === "unsubscribed" ||
    v === "inactive" ||
    v === "bounced" ||
    v === "junk" ||
    v === "spam" ||
    v === "unconfirmed" ||
    v === "cleaned" ||
    v === "не" ||
    v === "no"
  )
    return "unsubscribed";
  return undefined;
}

function parseConsent(value: string): boolean | undefined {
  const v = value.toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "да") return true;
  if (v === "false" || v === "0" || v === "no" || v === "не") return false;
  return undefined;
}

function localDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
): string | undefined {
  const parsed = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function parseTimestamp(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;

  // MailerLite: "2021-01-26 19:25:26". Safari cannot parse the space form itself.
  const ymd = v.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (ymd) {
    const [, y, mo, d, h, mi, s] = ymd;
    return localDate(+y, +mo, +d, +h, +mi, s ? +s : 0);
  }

  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString();

  // 26.01.2021 (Bulgarian spreadsheets)
  const dmy = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dmy) return localDate(+dmy[3], +dmy[2], +dmy[1]);

  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const yearPart = mdy[3];
    const year =
      yearPart.length === 2 ? 2000 + Number.parseInt(yearPart, 10) : Number.parseInt(yearPart, 10);
    return localDate(year, +mdy[1], +mdy[2]);
  }

  return undefined;
}

/**
 * What earlier versions of the importer wrote into `notes` (the location and
 * every extra column as „Label: value“). The server clears notes made only of
 * these, since the facts now hold the same data.
 */
function legacyNoteParts({ fields, extras }: MappedRow): string[] {
  return [
    fields.location,
    fields.country,
    ...extras.map((extra) => `${extra.label}: ${extra.value}`),
  ]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean);
}

/** Cells that mean „nothing“: „Нямам“, „-“, „no“… */
const EMPTY_ANSWER_RE = /^(нямам|няма|не ползвам|no|none|n\/a|-+|—)(?!\p{L})/iu;

/**
 * Phone numbers as MailerLite and Excel leave them: the leading 0 eaten
 * (888123456), the country code without "+" (359888123456), a letter O for a
 * zero. Only unambiguous forms are rewritten to +…; anything else stays as typed.
 * A cell with words in it is not a number and comes back as `invalid`.
 */
const INTERNATIONAL_WITHOUT_PLUS: [prefix: string, length: number][] = [
  ["359", 12],
  ["44", 12],
  ["49", 12],
  ["49", 13],
  ["43", 12],
  ["43", 13],
  ["353", 12],
  ["357", 11],
  ["30", 12],
  ["31", 11],
  ["32", 11],
  ["33", 11],
  ["34", 11],
  ["39", 11],
  ["39", 12],
  ["41", 11],
  ["971", 12],
];

export function normalizeImportPhone(
  raw: string,
): { phone?: string; invalid?: string } {
  const value = raw.trim();
  if (!value) return {};
  // In a cell with digits, a letter O (Latin or Cyrillic) is a mistyped zero.
  const compact = (/\d/.test(value) ? value.replace(/[OoОо]/g, "0") : value).replace(
    /[\s\-().\/]/g,
    "",
  );
  if (!/^\+?\d+$/.test(compact)) return { invalid: value };

  const digits = compact.replace(/^\+/, "");
  if (digits.replace(/0/g, "").length === 0 || digits.length < 6) return {};

  if (compact.startsWith("+")) return { phone: `+${digits}` };
  if (digits.startsWith("00")) return { phone: `+${digits.slice(2)}` };
  // Bulgarian mobile: 0888123456, or 888123456 with the 0 lost.
  if (digits.length === 10 && /^0[89]/.test(digits)) return { phone: `+359${digits.slice(1)}` };
  if (digits.length === 9 && /^[89]/.test(digits)) return { phone: `+359${digits}` };
  // UK mobile: 07123456789, or 7123456789 with the 0 lost.
  if (digits.length === 11 && digits.startsWith("07")) return { phone: `+44${digits.slice(1)}` };
  if (digits.length === 10 && /^7[1-9]/.test(digits)) return { phone: `+44${digits}` };
  if (
    INTERNATIONAL_WITHOUT_PLUS.some(
      ([prefix, length]) => digits.length === length && digits.startsWith(prefix),
    )
  ) {
    return { phone: `+${digits}` };
  }
  return { phone: compact };
}

function factLabel(label: string, mailerLite: boolean): string {
  const clean = label.replace(/^\+\s*/, "").trim();
  // MailerLite's built-in „Company“ field is used here for where the person came from.
  if (mailerLite && clean.toLowerCase() === "company") return "Откъде е дошъл";
  return clean;
}

/**
 * Everything the subscriber row has no column for, under a readable label:
 * the country, MailerLite's total spent, every custom field, and a phone cell
 * that held words instead of a number.
 */
function composeFacts(
  { fields, extras }: MappedRow,
  { mailerLite, invalidPhone }: { mailerLite: boolean; invalidPhone?: string },
): ImportFact[] {
  const facts: ImportFact[] = [];
  const country = fields.country || fields.location;
  if (country) facts.push({ label: "Държава", value: country });

  const spent = fields.total_spent?.trim();
  if (spent && Number.parseFloat(spent.replace(",", ".")) > 0) {
    facts.push({ label: mailerLite ? "Похарчено в MailerLite" : "Похарчено", value: spent });
  }

  for (const extra of extras) {
    facts.push({ label: factLabel(extra.label, mailerLite), value: extra.value });
  }
  if (invalidPhone) facts.push({ label: "Неразпознат номер", value: invalidPhone });

  // Two columns with one label (say „Company“ and „Откъде е дошъл“) become one fact.
  const byLabel = new Map<string, ImportFact>();
  for (const fact of facts) {
    const label = fact.label.slice(0, 300);
    const value = fact.value.slice(0, 4000);
    if (!label || !value) continue;
    const key = label.toLowerCase();
    const prior = byLabel.get(key);
    if (!prior) byLabel.set(key, { label, value });
    else if (!prior.value.split(", ").includes(value)) prior.value = `${prior.value}, ${value}`;
  }
  return [...byLabel.values()];
}

/**
 * Explicit language first (locale column, a "Bulgarian"/"English" group), then
 * a Cyrillic name — Bulgarians abroad still read Bulgarian, whatever MailerLite's
 * IP location says — then the location, then Bulgarian.
 */
function resolveImportLocale(
  row: Record<string, string>,
  groupLabels: string[],
): { locale: Locale; explicit: boolean } {
  const explicit = parseLocale(row.locale ?? "") ?? localeFromGroups(groupLabels);
  if (explicit) return { locale: explicit, explicit: true };

  const name = [row.name, row.first_name, row.last_name].join(" ");
  if (CYRILLIC_RE.test(name)) return { locale: "bg", explicit: false };

  return {
    locale: inferLocaleFromLocation(row.location || row.country) ?? "bg",
    explicit: false,
  };
}

function composeName(row: Record<string, string>): string | undefined {
  const direct = row.name?.trim();
  if (direct) return direct;
  const full = [row.first_name, row.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return full || undefined;
}

export function parseImportRows(
  rawRows: Record<string, unknown>[],
  segments: Segment[],
  defaultSegmentKeys: string[] = [],
): ParsedImport {
  const rows: ImportSubscriberRow[] = [];
  const skipped: ParsedImport["skipped"] = [];
  const defaults = defaultSegmentKeys.filter((k) => k && k !== "all");
  const resolve = createSegmentResolver(segments);
  const segmentNames = new Map(segments.map((s) => [s.key, s.name]));
  const newSegments = new Map<string, ImportNewSegment>();
  const usage = new Map<string, number>();
  const isKnown = (label: string) => resolve(label)?.existing === true;

  const mappedRows = rawRows.map(mapRow);
  const factUsage = new Map<string, number>();
  // MailerLite names the e-mail column „Subscriber“ and has a „Groups“ column.
  const mailerLite = rawRows.some((raw) =>
    Object.keys(raw).some((key) => {
      const normalized = normalizeHeader(key);
      return normalized === "subscriber" || normalized === "groups";
    }),
  );
  // MailerLite separates groups with ";" and keeps commas inside group names.
  // A file without a single ";" in its Groups column separates them with commas.
  const groupSeparator = mappedRows.some((m) => m.fields.groups?.includes(";"))
    ? ";"
    : ",";

  mappedRows.forEach((mapped, index) => {
    const line = index + 2;
    const row = mapped.fields;
    const email = row.email?.trim().toLowerCase() ?? "";

    if (!email) {
      if (Object.values(row).every((v) => !v)) return;
      skipped.push({ line, reason: "Missing email" });
      return;
    }

    if (!EMAIL_RE.test(email)) {
      skipped.push({ line, reason: `Invalid email: ${email}` });
      return;
    }

    // MailerLite exports "Name" + "Last name" — there "Name" is the first name.
    if (row.name && row.last_name && !row.first_name) {
      row.first_name = row.name;
      delete row.name;
    }

    const groupLabels = splitGroupLabels(row.groups ?? "", groupSeparator, isKnown);
    const tagLabels = (row.tags ?? "")
      .split(/[,|;]/)
      .map((label) => label.trim())
      .filter(Boolean);

    const fromFile: string[] = [];
    const collect = (labels: string[], group?: string) => {
      for (const label of labels) {
        const resolved = resolve(label);
        if (!resolved || resolved.key === "all") continue;
        fromFile.push(resolved.key);
        if (!resolved.existing && !newSegments.has(resolved.key)) {
          newSegments.set(resolved.key, { key: resolved.key, name: label, group });
        }
      }
    };
    collect(groupLabels, MAILERLITE_SEGMENT_GROUP);
    collect(tagLabels);

    const { locale, explicit } = resolveImportLocale(row, groupLabels);
    const segmentKeys = applyEnglishRecipientTag(
      Array.from(
        new Set([...fromFile, ...(fromFile.length === 0 ? defaults : [])]),
      ),
      locale,
    );
    for (const key of segmentKeys) usage.set(key, (usage.get(key) ?? 0) + 1);

    const createdAt = parseTimestamp(row.created_at ?? "");
    const phone = normalizeImportPhone(row.phone ?? "");
    const facebook = row.facebook_url && !EMPTY_ANSWER_RE.test(row.facebook_url)
      ? row.facebook_url
      : undefined;
    const facts = composeFacts(mapped, { mailerLite, invalidPhone: phone.invalid });
    for (const fact of facts) factUsage.set(fact.label, (factUsage.get(fact.label) ?? 0) + 1);
    const legacy = legacyNoteParts(mapped);

    rows.push({
      email,
      name: composeName(row),
      first_name: row.first_name || undefined,
      last_name: row.last_name || undefined,
      phone: phone.phone,
      facebook_url: facebook,
      locale,
      locale_explicit: explicit,
      status: parseStatus(row.status ?? "") ?? "subscribed",
      segments: segmentKeys,
      source: row.source || undefined,
      // Only a real notes column — everything else goes to the facts.
      notes: row.notes?.trim() || undefined,
      consent: parseConsent(row.consent ?? ""),
      created_at: createdAt,
      ...(facts.length > 0
        ? { facts, facts_source: mailerLite ? "MailerLite" : "" }
        : {}),
      ...(legacy.length > 0 ? { legacy_note_parts: legacy } : {}),
    });
  });

  const segmentUsage: ImportSegmentUsage[] = [...usage.entries()]
    .map(([key, count]) => ({
      key,
      name: segmentNames.get(key) ?? newSegments.get(key)?.name ?? key,
      isNew: !segmentNames.has(key),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "bg"));

  return {
    rows,
    skipped,
    segments: segmentUsage,
    newSegments: [...newSegments.values()],
    facts: [...factUsage.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "bg")),
  };
}

function sheetRowsFromWorkbook(book: XLSX.WorkBook): Record<string, unknown>[] {
  const sheet = book.Sheets[book.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
}

/** UTF-8 first; a Bulgarian Excel "CSV" is often Windows-1251. */
function decodeText(buffer: ArrayBuffer): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      text = new TextDecoder("windows-1251").decode(buffer);
    } catch {
      text = new TextDecoder("utf-8").decode(buffer);
    }
  }
  return text.replace(/^﻿/, "");
}

export async function parseSubscriberFile(
  file: File,
  segments: Segment[],
  defaultSegmentKeys: string[] = [],
): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  let rawRows: Record<string, unknown>[];

  if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    // raw: every cell stays text — no "+359…" turned into a number, no
    // "2021-01-26 19:25:26" cut down to a date without the time.
    // The delimiter (comma, semicolon or MailerLite's tab) is detected.
    const book = XLSX.read(decodeText(buffer), { type: "string", raw: true });
    rawRows = sheetRowsFromWorkbook(book);
  } else {
    const book = XLSX.read(buffer, { type: "array" });
    rawRows = sheetRowsFromWorkbook(book);
  }

  return parseImportRows(rawRows, segments, defaultSegmentKeys);
}

/** Template for download — same columns as export. */
export function downloadImportTemplate() {
  const example = [
    {
      email: "client@example.com",
      name: "Maria Ivanova",
      first_name: "Maria",
      last_name: "Ivanova",
      phone: "+359888123456",
      facebook_url: "https://facebook.com/maria",
      locale: "bg",
      status: "subscribed",
      tags: "weight-loss|insulin-resistance",
      source: "import",
      notes: "",
      consent: "true",
      created_at: "2026-01-15T10:00:00.000Z",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(example, {
    header: [...SUBSCRIBER_SPREADSHEET_COLUMNS],
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Subscribers");
  XLSX.writeFile(book, "subscribers-import-template.xlsx");
}
