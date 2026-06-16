import * as XLSX from "xlsx";
import type { Subscriber } from "@/lib/supabase/types";
import { formatScheduledAt } from "@/lib/datetime";

const COLUMNS = [
  "email",
  "name",
  "phone",
  "locale",
  "status",
  "segments",
  "source",
  "notes",
  "created_at",
] as const;

function rowForSubscriber(s: Subscriber): Record<(typeof COLUMNS)[number], string> {
  return {
    email: s.email,
    name: s.name ?? "",
    phone: s.phone ?? "",
    locale: s.locale,
    status: s.status,
    segments: s.tags.join(", "),
    source: s.source,
    notes: s.notes ?? "",
    created_at: formatScheduledAt(s.created_at, "en"),
  };
}

export function exportSubscribersExcel(
  subscribers: Subscriber[],
  filenamePrefix = "subscribers",
) {
  const rows = subscribers.map(rowForSubscriber);
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...COLUMNS] });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Subscribers");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `${filenamePrefix}-${date}.xlsx`);
}

export function exportSubscribersCsv(
  subscribers: Subscriber[],
  filenamePrefix = "subscribers",
) {
  const rows = subscribers.map(rowForSubscriber);
  const header = [...COLUMNS];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
