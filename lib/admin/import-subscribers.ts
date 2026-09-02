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

export type ImportSubscriberRow = {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  facebook_url?: string;
  locale?: Locale;
  status?: "subscribed" | "unsubscribed";
  segments: string[];
  source?: string;
  notes?: string;
  consent?: boolean;
  created_at?: string;
};

export type ParsedImport = {
  rows: ImportSubscriberRow[];
  skipped: { line: number; reason: string }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<string, string> = {
  email: "email",
  e_mail: "email",
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
  source: "source",
  източник: "source",
  notes: "notes",
  note: "notes",
  бележки: "notes",
  location: "location",
  country: "location",
  държава: "location",
  consent: "consent",
  created_at: "created_at",
  created: "created_at",
  subscribed: "created_at",
  updated_at: "updated_at",
};

function mapRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(key);
    const field = HEADER_ALIASES[normalized] ?? normalized;
    const next = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!next) continue;
    if (field in out && out[field]) continue;
    out[field] = next;
  }
  return out;
}

export function resolveSegmentTokens(
  value: string,
  segments: Segment[],
): string[] {
  if (!value.trim()) return [];

  const keySet = new Set(segments.map((s) => s.key));
  const nameToKey = new Map(
    segments.map((s) => [s.name.toLowerCase(), s.key]),
  );
  const slugToKey = new Map(segments.map((s) => [s.key, s.key]));

  return value
    .split(/[,|;]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (keySet.has(part)) return part;
      if (keySet.has(lower)) return lower;
      if (nameToKey.has(lower)) return nameToKey.get(lower)!;
      const slug = slugify(part);
      if (slugToKey.has(slug)) return slug;
      return slug || part;
    })
    .filter((key) => key !== "all");
}

function parseLocale(value: string): Locale | undefined {
  const v = value.toLowerCase();
  if (v === "bg" || v === "bulgarian" || v.startsWith("бг")) return "bg";
  if (v === "en" || v === "english") return "en";
  return undefined;
}

function parseStatus(value: string): "subscribed" | "unsubscribed" | undefined {
  const v = value.toLowerCase();
  if (v === "subscribed" || v === "active" || v === "да" || v === "yes")
    return "subscribed";
  if (v === "unsubscribed" || v === "inactive" || v === "не" || v === "no")
    return "unsubscribed";
  return undefined;
}

function parseConsent(value: string): boolean | undefined {
  const v = value.toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "да") return true;
  if (v === "false" || v === "0" || v === "no" || v === "не") return false;
  return undefined;
}

function parseTimestamp(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;

  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString();

  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const yearPart = mdy[3];
    const year =
      yearPart.length === 2 ? 2000 + Number.parseInt(yearPart, 10) : Number.parseInt(yearPart, 10);
    const parsed = new Date(
      year,
      Number.parseInt(mdy[1], 10) - 1,
      Number.parseInt(mdy[2], 10),
    );
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return undefined;
}

function composeNotes(row: Record<string, string>): string | undefined {
  const parts = [row.notes, row.location]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function resolveImportLocale(row: Record<string, string>): Locale {
  return (
    parseLocale(row.locale ?? "") ??
    inferLocaleFromLocation(row.location) ??
    "bg"
  );
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

  rawRows.forEach((raw, index) => {
    const line = index + 2;
    const row = mapRow(raw);
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

    const fromFile = resolveSegmentTokens(row.tags ?? "", segments);
    const locale = resolveImportLocale(row);
    const segmentKeys = applyEnglishRecipientTag(
      Array.from(
        new Set([...fromFile, ...(fromFile.length === 0 ? defaults : [])]),
      ),
      locale,
    );

    const createdAt = parseTimestamp(row.created_at ?? row.subscribed ?? "");

    rows.push({
      email,
      name: composeName(row),
      first_name: row.first_name || undefined,
      last_name: row.last_name || undefined,
      phone: row.phone || undefined,
      facebook_url: row.facebook_url || undefined,
      locale,
      status: parseStatus(row.status ?? "") ?? "subscribed",
      segments: segmentKeys,
      source: row.source || undefined,
      notes: composeNotes(row),
      consent: parseConsent(row.consent ?? ""),
      created_at: createdAt,
    });
  });

  return { rows, skipped };
}

function sheetRowsFromWorkbook(book: XLSX.WorkBook): Record<string, unknown>[] {
  const sheet = book.Sheets[book.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
}

export async function parseSubscriberFile(
  file: File,
  segments: Segment[],
  defaultSegmentKeys: string[] = [],
): Promise<ParsedImport> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();

  let rawRows: Record<string, unknown>[];

  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8")
      .decode(buffer)
      .replace(/^\uFEFF/, "");
    const book = XLSX.read(text, { type: "string" });
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
