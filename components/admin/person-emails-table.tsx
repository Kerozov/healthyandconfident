import { formatDate } from "@/lib/utils";
import {
  PERSON_EMAIL_KIND_LABELS,
  PERSON_EMAIL_STATUS_LABELS,
  type PersonEmailItem,
  type PersonEmailStatus,
} from "@/lib/admin/person-email";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PersonEmailStatus, string> = {
  sent: "text-forest-700 bg-forest-500/10",
  scheduled: "text-gold-700 bg-gold-400/15",
  pending: "text-gold-700 bg-gold-400/15",
  failed: "text-coral-700 bg-coral-500/15",
  skipped: "text-ink-soft bg-ink/10",
  canceled: "text-ink-soft bg-ink/10",
};

const KIND_LABELS = PERSON_EMAIL_KIND_LABELS;

export function PersonEmailsTable({
  emails,
  emptyMessage = "Няма записани имейли за този човек.",
}: {
  emails: PersonEmailItem[];
  emptyMessage?: string;
}) {
  if (emails.length === 0) {
    return <p className="text-sm text-ink-soft">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft/60">
            <th className="px-3 py-2">Имейл</th>
            <th className="px-3 py-2">Тип</th>
            <th className="px-3 py-2">Статус</th>
            <th className="px-3 py-2">Дата</th>
            <th className="px-3 py-2">Отворен</th>
            <th className="px-3 py-2">Кликове</th>
            <th className="px-3 py-2">Бележка</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((item, i) => (
            <tr
              key={`${item.kind}-${item.title}-${item.at}-${i}`}
              className="border-b border-ink/5 last:border-0"
            >
              <td className="px-3 py-2 font-medium">{item.title}</td>
              <td className="px-3 py-2 text-ink-soft">{KIND_LABELS[item.kind]}</td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_STYLES[item.status],
                  )}
                >
                  {PERSON_EMAIL_STATUS_LABELS[item.status]}
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-ink-soft">
                {formatDate(item.at, "bg")}
              </td>
              <td className="px-3 py-2 text-xs text-ink-soft">
                {item.status === "sent"
                  ? item.opened
                    ? item.openedAt
                      ? formatDate(item.openedAt, "bg")
                      : "Да"
                    : "—"
                  : "—"}
              </td>
              <td className="px-3 py-2 font-medium text-forest-700">
                {item.status === "sent" ? item.clicks : "—"}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2 text-xs text-coral-700">
                {item.error ?? (item.workerJobId ? "" : item.status === "failed" ? "Без worker job" : "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
