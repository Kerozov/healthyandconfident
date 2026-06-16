import * as XLSX from "xlsx";
import type { Locale, Segment } from "@/lib/supabase/types";
import { slugify } from "@/lib/utils";

export type ImportSubscriberRow = {
  email: string;
  name?: string;
  phone?: string;
  locale?: Locale;
  status?: "subscribed" | "unsubscribed";
  segments: string[];
  notes?: string;
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
  name: "name",
  ime: "name",
  phone: "phone",
  tel: "phone",
  telephone: "phone",
  mobile: "phone",
  телефон: "phone",
  locale: "locale",
  language: "locale",
  lang: "locale",
  език: "locale",
  status: "status",
  статус: "status",
  segments: "segments",
  segment: "segments",
  tags: "segments",
  tag: "segments",
  сегменти: "segments",
  notes: "notes",
  note: "notes",
  бележки: "notes",
};

function mapRow(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(key);
    const field = HEADER_ALIASES[normalized] ?? normalized;
    out[field] = String(value ?? "").trim();
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
    const email = row.email.trim().toLowerCase();

    if (!email) {
      if (Object.values(row).every((v) => !v)) return;
      skipped.push({ line, reason: "Missing email" });
      return;
    }

    if (!EMAIL_RE.test(email)) {
      skipped.push({ line, reason: `Invalid email: ${email}` });
      return;
    }

    const fromFile = resolveSegmentTokens(row.segments ?? "", segments);
    const segmentKeys = Array.from(
      new Set([...fromFile, ...(fromFile.length === 0 ? defaults : [])]),
    );

    rows.push({
      email,
      name: row.name || undefined,
      phone: row.phone || undefined,
      locale: parseLocale(row.locale ?? "") ?? "bg",
      status: parseStatus(row.status ?? "") ?? "subscribed",
      segments: segmentKeys,
      notes: row.notes || undefined,
    });
  });

  return { rows, skipped };
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
    const text = new TextDecoder("utf-8").decode(buffer);
    const book = XLSX.read(text, { type: "string" });
    const sheet = book.Sheets[book.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
  } else {
    const book = XLSX.read(buffer, { type: "array" });
    const sheet = book.Sheets[book.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
  }

  return parseImportRows(rawRows, segments, defaultSegmentKeys);
}

/** Template for download — same columns as export. */
export function downloadImportTemplate() {
  const example = [
    {
      email: "client@example.com",
      name: "Maria Ivanova",
      phone: "+359888123456",
      locale: "bg",
      status: "subscribed",
      segments: "weight-loss, insulin-resistance",
      notes: "",
    },
  ];
  const sheet = XLSX.utils.json_to_sheet(example);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Subscribers");
  XLSX.writeFile(book, "subscribers-import-template.xlsx");
}
