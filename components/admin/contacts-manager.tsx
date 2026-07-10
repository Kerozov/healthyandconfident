"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ContactListRow } from "@/lib/contacts/types";
import { formatDate } from "@/lib/utils";

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Неплатил",
  paid: "Платил",
};

export function ContactsManager({
  contacts,
}: {
  contacts: ContactListRow[];
}) {
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [reminderFilter, setReminderFilter] = useState<"all" | "yes" | "no">("all");
  const [zoomFilter, setZoomFilter] = useState<"all" | "yes" | "no">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (paymentFilter !== "all" && c.payment_status !== paymentFilter) return false;
      if (reminderFilter === "yes" && c.pending_reminder_count === 0) return false;
      if (reminderFilter === "no" && c.pending_reminder_count > 0) return false;
      if (zoomFilter === "yes" && !c.zoom_attended) return false;
      if (zoomFilter === "no" && c.zoom_attended) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!c.email.includes(q) && !(c.name ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [contacts, paymentFilter, reminderFilter, zoomFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Всички — плащане</option>
          <option value="unpaid">Неплатили</option>
          <option value="paid">Платили</option>
        </select>
        <select
          value={reminderFilter}
          onChange={(e) => setReminderFilter(e.target.value as typeof reminderFilter)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Всички — reminders</option>
          <option value="yes">С pending reminders</option>
          <option value="no">Без pending reminders</option>
        </select>
        <select
          value={zoomFilter}
          onChange={(e) => setZoomFilter(e.target.value as typeof zoomFilter)}
          className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">Всички — Zoom</option>
          <option value="yes">Участвали в Zoom</option>
          <option value="no">Без Zoom</option>
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Търси имейл…"
          className="min-w-[200px] flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-ink/10 bg-cream/50 text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Имейл</th>
              <th className="px-4 py-3">Плащане</th>
              <th className="px-4 py-3">Reminders</th>
              <th className="px-4 py-3">Zoom</th>
              <th className="px-4 py-3">Създаден</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-ink/5 hover:bg-cream/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/contacts/${c.id}`}
                    className="font-medium text-forest-700 hover:underline"
                  >
                    {c.email}
                  </Link>
                  {c.name && (
                    <p className="text-xs text-ink-soft">{c.name}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      c.payment_status === "paid"
                        ? "text-forest-700 font-medium"
                        : "text-amber-700"
                    }
                  >
                    {PAYMENT_LABELS[c.payment_status] ?? c.payment_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {c.pending_reminder_count > 0
                    ? `${c.pending_reminder_count} pending`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {c.zoom_attended ? `Да (${c.zoom_total_minutes} мин.)` : "Не"}
                </td>
                <td className="px-4 py-3 text-ink-soft">{formatDate(c.created_at, "bg")}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  Няма контакти по тези филтри.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
