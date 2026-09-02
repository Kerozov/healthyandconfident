import * as XLSX from "xlsx";
import type { Subscriber } from "@/lib/supabase/types";
import { SUBSCRIBER_SPREADSHEET_COLUMNS } from "@/lib/admin/import-subscribers";

function rowForSubscriber(
  s: Subscriber,
): Record<(typeof SUBSCRIBER_SPREADSHEET_COLUMNS)[number], string> {
  return {
    email: s.email,
    name: s.name ?? "",
    first_name: s.first_name ?? "",
    last_name: s.last_name ?? "",
    phone: s.phone ?? "",
    facebook_url: s.facebook_url ?? "",
    locale: s.locale,
    status: s.status,
    tags: s.tags.join("|"),
    source: s.source,
    notes: s.notes ?? "",
    consent: s.consent ? "true" : "false",
    created_at: s.created_at,
    updated_at: s.updated_at,
  };
}

export function exportSubscribersExcel(
  subscribers: Subscriber[],
  filenamePrefix = "subscribers",
) {
  const rows = subscribers.map(rowForSubscriber);
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: [...SUBSCRIBER_SPREADSHEET_COLUMNS],
  });
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
  const header = [...SUBSCRIBER_SPREADSHEET_COLUMNS];
  const lines = [
    header.join(";"),
    ...rows.map((row) =>
      header
        .map((key) => `"${String(row[key]).replace(/"/g, '""')}"`)
        .join(";"),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
