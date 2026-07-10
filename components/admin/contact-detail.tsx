"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, XCircle } from "lucide-react";
import type { Contact, ContactEvent, ContactWorkerJob } from "@/lib/contacts/types";
import type { JobEngagement } from "@/lib/admin/contacts-data";
import { cancelContactJobAction } from "@/app/(admin)/admin/actions";
import { formatDate } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  link_click: "Кликнал имейл бутон",
  page_view: "Преглед на страница",
  checkout_started: "Започнал checkout",
  payment_completed: "Платил",
  zoom_joined: "Zoom — влязъл",
  zoom_left: "Zoom — излязъл",
  reminders_canceled: "Reminders отменени",
};

function eventDetails(event: ContactEvent): string {
  const m = event.metadata ?? {};
  switch (event.event_type) {
    case "link_click":
      return [event.campaign_id, event.worker_job_id, m.target]
        .filter(Boolean)
        .join(" · ");
    case "payment_completed":
      return [
        m.stripe_session_id,
        m.amount_cents != null ? `${Number(m.amount_cents) / 100}` : null,
        m.currency,
      ]
        .filter(Boolean)
        .join(" · ");
    case "zoom_left":
      return m.duration_minutes != null ? `${m.duration_minutes} мин.` : "";
    case "reminders_canceled":
      return m.count != null ? `${m.count} jobs` : "";
    case "checkout_started":
      return Array.isArray(m.product_ids)
        ? (m.product_ids as string[]).join(", ")
        : "";
    default:
      return event.source ?? "";
  }
}

export function ContactDetailView({
  contact,
  events,
  jobs,
  jobEngagement,
}: {
  contact: Contact;
  events: ContactEvent[];
  jobs: ContactWorkerJob[];
  jobEngagement: Record<string, JobEngagement>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function cancelJob(localJobId: string) {
    if (!confirm("Отмени този scheduled reminder в worker-а?")) return;
    setBusyJobId(localJobId);
    setNote(null);
    startTransition(async () => {
      const res = await cancelContactJobAction(localJobId);
      setNote(res.message ?? (res.ok ? "Отменено." : "Грешка."));
      setBusyJobId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <Link
        href="/admin/contacts"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Назад към контакти
      </Link>

      {note && (
        <p className="rounded-lg bg-cream px-4 py-2 text-sm text-ink-soft">{note}</p>
      )}

      <section className="rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Профил</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Имейл</dt>
            <dd className="font-medium">{contact.email}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Име</dt>
            <dd>{contact.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Плащане</dt>
            <dd className={contact.payment_status === "paid" ? "text-forest-700 font-medium" : ""}>
              {contact.payment_status === "paid" ? "Платил" : "Неплатил"}
              {contact.paid_at && ` · ${formatDate(contact.paid_at, "bg")}`}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Zoom</dt>
            <dd>
              {contact.zoom_attended
                ? `Да · ${contact.zoom_total_minutes} мин. общо`
                : "Не"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Journey timeline</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase text-ink-soft">
              <tr>
                <th className="py-2 pr-4">Време</th>
                <th className="py-2 pr-4">Събитие</th>
                <th className="py-2">Детайли</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-ink/5">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-ink-soft">
                    {formatDate(e.created_at, "bg")}
                  </td>
                  <td className="py-2.5 pr-4 font-medium">
                    {EVENT_LABELS[e.event_type] ?? e.event_type}
                  </td>
                  <td className="py-2.5 text-ink-soft">{eventDetails(e) || "—"}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-ink-soft">
                    Няма събития още.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Scheduled worker jobs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase text-ink-soft">
              <tr>
                <th className="py-2 pr-3">Sequence</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Scheduled</th>
                <th className="py-2 pr-3">Worker job</th>
                <th className="py-2 pr-3">Opens</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const eng = jobEngagement[j.worker_job_id];
                return (
                  <tr key={j.id} className="border-b border-ink/5">
                    <td className="py-2.5 pr-3">{j.sequence_key}</td>
                    <td className="py-2.5 pr-3">{j.status}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {j.scheduled_at ? formatDate(j.scheduled_at, "bg") : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{j.worker_job_id}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {eng ? `${eng.opened}/${eng.sent} opened` : "—"}
                    </td>
                    <td className="py-2.5">
                      {j.status === "pending" && (
                        <button
                          type="button"
                          disabled={pending && busyJobId === j.id}
                          onClick={() => cancelJob(j.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 hover:underline disabled:opacity-50"
                        >
                          {pending && busyJobId === j.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-ink-soft">
                    Няма worker jobs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
