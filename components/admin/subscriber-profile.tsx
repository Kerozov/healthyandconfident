"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarPlus,
  CreditCard,
  ExternalLink,
  FileText,
  FolderTree,
  Loader2,
  Mail,
  MailOpen,
  MousePointerClick,
  Pencil,
  Phone,
  RefreshCw,
  Sparkles,
  UserCheck,
  UserMinus,
  Video,
} from "lucide-react";
import type {
  ContactStatus,
  Segment,
  SegmentGroup,
  Subscriber,
  SubscriberHistoryEntry,
} from "@/lib/supabase/types";
import type {
  ClickEventItem,
  EmailEngagementSummary,
  EngagementActivityItem,
} from "@/lib/admin/engagement";
import type { PersonEmailItem } from "@/lib/admin/person-email";
import type {
  ContactSummary,
  PersonFormSubmission,
  PersonPurchase,
  PersonZoomSession,
} from "@/lib/admin/person-profile";
import { updateSubscriber } from "@/app/(admin)/admin/actions";
import { assignableSegments } from "@/components/admin/segment-checklist";
import { StatusBadge } from "@/components/admin/contact-status-badge";
import { ContactStatusDialog } from "@/components/admin/contact-status-dialog";
import { SubscriberEditDialog } from "@/components/admin/subscriber-edit-dialog";
import { PersonEmailsTable } from "@/components/admin/person-emails-table";
import { AdminNavLink, useAdminNavigate } from "@/components/admin/admin-navigation";
import { Alert } from "@/components/admin/ui";
import {
  CONTACTS_LIST_URL_KEY,
  formatDateTime,
  formatShortDate,
  groupChipsForTags,
  personDisplayName,
  personInitials,
  SOURCE_CATEGORY_LABELS,
  sourceCategory,
  sourceLabel,
  statusColorClasses,
} from "@/lib/admin/contact-crm";
import { activityInterestLabelsFromTags, isActivityTag } from "@/lib/site/activity-tags";
import { SCHEDULE_TIMEZONE } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type SubscriberProfileData = {
  engagement: {
    summary: EmailEngagementSummary;
    emails: PersonEmailItem[];
    activity: EngagementActivityItem[];
    clickEvents: ClickEventItem[];
  } | null;
  profile: {
    contact: ContactSummary;
    purchases: PersonPurchase[];
    formSubmissions: PersonFormSubmission[];
    zoomSessions: PersonZoomSession[];
  } | null;
  /** Some source failed to load — what is shown may be incomplete. */
  partial: boolean;
};

const TIER: Record<EmailEngagementSummary["tier"], { label: string; className: string; hint: string }> = {
  hot: { label: "Горещ", className: "bg-coral-500/15 text-coral-700", hint: "отваря и кликва редовно" },
  warm: { label: "Топъл", className: "bg-amber-50 text-amber-900", hint: "отваря или е кликвал" },
  cold: { label: "Хладен", className: "bg-sky-50 text-sky-800", hint: "отваря рядко" },
  none: { label: "Без реакция", className: "bg-ink/5 text-ink-soft", hint: "още не е реагирал" },
};

// ── Timeline ────────────────────────────────────────────────

type TimelineKind =
  | "status"
  | "groups"
  | "sync"
  | "signup"
  | "email"
  | "click"
  | "zoom"
  | "purchase"
  | "form";

type TimelineFilter = "all" | "status" | "groups" | "emails" | "zoom" | "purchase" | "form";

const FILTER_OF: Record<TimelineKind, TimelineFilter> = {
  status: "status",
  groups: "groups",
  sync: "groups",
  signup: "groups",
  email: "emails",
  click: "emails",
  zoom: "zoom",
  purchase: "purchase",
  form: "form",
};

const FILTER_LABELS: Record<TimelineFilter, string> = {
  all: "Всичко",
  status: "Статуси",
  groups: "Групи и записване",
  emails: "Имейли и кликове",
  zoom: "Zoom",
  purchase: "Покупки",
  form: "Форми",
};

const KIND_ICON = {
  status: BadgeCheck,
  groups: FolderTree,
  sync: RefreshCw,
  signup: CalendarPlus,
  email: Mail,
  click: MousePointerClick,
  zoom: Video,
  purchase: CreditCard,
  form: FileText,
} as const;

const KIND_TONE: Record<TimelineKind, string> = {
  status: "bg-violet-50 text-violet-700",
  groups: "bg-forest-100 text-forest-700",
  sync: "bg-sky-50 text-sky-700",
  signup: "bg-forest-600 text-cream",
  email: "bg-slate-100 text-slate-700",
  click: "bg-sky-50 text-sky-800",
  zoom: "bg-amber-50 text-amber-800",
  purchase: "bg-coral-500/15 text-coral-700",
  form: "bg-ink/5 text-ink",
};

type TimelineItem = {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  meta?: string;
  actor?: string;
  comment?: string | null;
  added?: string[];
  removed?: string[];
  statusColor?: string | null;
};

const dayFormat = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SCHEDULE_TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SCHEDULE_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function buildTimeline(
  subscriber: Subscriber,
  history: SubscriberHistoryEntry[],
  data: SubscriberProfileData,
  formNames: Record<string, string>,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  items.push({
    id: "signup",
    at: subscriber.created_at,
    kind: "signup",
    title: "Влезе в списъка",
    meta: sourceLabel(subscriber.source, formNames),
  });

  for (const h of history) {
    if (h.kind === "status") {
      items.push({
        id: h.id,
        at: h.created_at,
        kind: "status",
        title: h.status_name
          ? h.previous_status_name
            ? `Статус: ${h.previous_status_name} → ${h.status_name}`
            : `Статус: ${h.status_name}`
          : h.previous_status_name
            ? `Статусът „${h.previous_status_name}“ е махнат`
            : "Статусът е махнат",
        actor: h.actor_name,
        comment: h.comment,
        statusColor: h.status_color,
      });
    } else if (h.kind === "groups") {
      const added = Array.isArray(h.details.added) ? (h.details.added as string[]) : [];
      const removed = Array.isArray(h.details.removed) ? (h.details.removed as string[]) : [];
      items.push({
        id: h.id,
        at: h.created_at,
        kind: "groups",
        title: "Групите са променени",
        meta:
          h.details.startAutomations === false && added.length > 0
            ? "без автоматизации"
            : undefined,
        actor: h.actor_name,
        added,
        removed,
      });
    } else if (h.kind === "sync") {
      const funnel = typeof h.details.funnel === "string" ? h.details.funnel : null;
      const added = Array.isArray(h.details.added) ? (h.details.added as string[]) : [];
      items.push({
        id: h.id,
        at: h.created_at,
        kind: "sync",
        title: h.details.created ? "Дойде от Launchify" : "Обновен от Launchify",
        meta: funnel ? `уебинар „${funnel}“` : undefined,
        actor: h.actor_name && h.actor_name !== "Launchify" ? `пусната от ${h.actor_name}` : undefined,
        added,
      });
    }
  }

  for (const a of data.engagement?.activity ?? []) {
    items.push({
      id: `email-${a.sentAt}-${a.title}`,
      at: a.sentAt,
      kind: "email",
      title: a.title,
      meta: [
        a.kind === "campaign" ? "кампания" : "автоматизация",
        a.clicks > 0 ? `отворен и кликнат (${a.clicks})` : a.opened ? "отворен" : "не е отворен",
      ].join(" · "),
    });
  }
  for (const c of data.engagement?.clickEvents ?? []) {
    items.push({
      id: `click-${c.clickedAt}-${c.targetUrl ?? ""}`,
      at: c.clickedAt,
      kind: "click",
      title: `Кликна „${c.linkLabel || c.targetUrl || "линк"}“`,
      meta: c.sourceTitle,
    });
  }
  for (const z of data.profile?.zoomSessions ?? []) {
    items.push({
      id: `zoom-${z.leftAt}-${z.meetingId ?? ""}`,
      at: z.joinedAt ?? z.leftAt,
      kind: "zoom",
      title: z.title || "Zoom сесия",
      meta: `${z.durationMinutes} мин.${typeof z.stayPct === "number" ? ` · остана ${z.stayPct}% от сесията` : ""}`,
    });
  }
  for (const p of data.profile?.purchases ?? []) {
    items.push({
      id: `purchase-${p.purchasedAt}-${p.productTitle}`,
      at: p.purchasedAt,
      kind: "purchase",
      title: p.productTitle,
      meta:
        p.paymentStatus === "paid"
          ? p.amountCents != null && p.currency
            ? `платено ${formatMoney(p.amountCents, p.currency)}`
            : "платено"
          : p.paymentStatus === "refunded"
            ? "парите са върнати"
            : "неуспешно плащане",
    });
  }
  for (const f of data.profile?.formSubmissions ?? []) {
    items.push({
      id: `form-${f.submittedAt}-${f.formName}`,
      at: f.submittedAt,
      kind: "form",
      title: `Попълни „${f.formName}“`,
      meta: plural(f.rows.length, "отговор", "отговора"),
    });
  }

  return items
    .filter((i) => i.at && !Number.isNaN(new Date(i.at).getTime()))
    .sort((a, b) => b.at.localeCompare(a.at));
}

// ── Small building blocks ───────────────────────────────────

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: typeof Mail;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-ink/10 bg-white p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          {Icon && <Icon className="h-4 w-4 text-ink-soft" aria-hidden />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-ink",
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className={cn("mt-1.5 font-display text-2xl font-semibold [font-variant-numeric:tabular-nums]", tone)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs leading-snug text-ink-soft">{sub}</p>}
    </div>
  );
}

function TagChip({
  name,
  tone = "forest",
}: {
  name: string;
  tone?: "forest" | "added" | "removed" | "quiet" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "forest" && "bg-forest-50 text-forest-700",
        tone === "added" && "bg-emerald-50 text-emerald-800",
        tone === "removed" && "bg-rose-50 text-rose-800 line-through decoration-rose-400/70",
        tone === "quiet" && "bg-ink/5 text-ink-soft",
        tone === "gold" && "bg-amber-50 text-amber-900",
      )}
    >
      <span className="truncate">
        {tone === "added" ? "+ " : tone === "removed" ? "− " : ""}
        {name}
      </span>
    </span>
  );
}

// ── The profile ─────────────────────────────────────────────

export function SubscriberProfile({
  subscriber,
  segments,
  groups,
  statuses,
  statusesAvailable,
  history,
  formNames,
  subscriberTags,
  data,
}: {
  subscriber: Subscriber;
  segments: Segment[];
  groups: SegmentGroup[];
  statuses: ContactStatus[];
  statusesAvailable: boolean;
  history: SubscriberHistoryEntry[];
  formNames: Record<string, string>;
  subscriberTags: string[];
  data: SubscriberProfileData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const { navigate, pendingHref } = useAdminNavigate();
  const backPending = pendingHref?.startsWith("/admin/subscribers") ?? false;

  /** Back to the list as it was left — filters, sort and page. */
  function goBack() {
    let href = "/admin/subscribers";
    try {
      const saved = window.sessionStorage.getItem(CONTACTS_LIST_URL_KEY);
      if (saved?.startsWith("/admin/subscribers")) href = saved;
    } catch {
      // Storage blocked — the plain list is fine.
    }
    navigate(href);
  }

  const name = personDisplayName(subscriber);
  const status = subscriber.crm_status_id
    ? statuses.find((s) => s.id === subscriber.crm_status_id)
    : undefined;
  const segmentNameByKey = useMemo(
    () => new Map(segments.map((s) => [s.key, s.name])),
    [segments],
  );
  const groupLabel = (key: string) => segmentNameByKey.get(key) ?? key;

  const { chips, quiet } = useMemo(
    () => groupChipsForTags(subscriber.tags ?? [], segments, groups),
    [subscriber.tags, segments, groups],
  );
  const chipsBySegment = useMemo(() => {
    const map = new Map<string, typeof chips>();
    // Interests (free menu) already have their own row above.
    for (const chip of chips.filter((c) => !isActivityTag(c.key))) {
      const key = chip.segmentName ?? "";
      const list = map.get(key) ?? [];
      list.push(chip);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b, "bg");
    });
  }, [chips]);
  const interests = activityInterestLabelsFromTags(subscriber.tags ?? []);

  const segmentKeySet = useMemo(
    () => new Set(assignableSegments(segments).map((s) => s.key)),
    [segments],
  );
  const customTagOptions = useMemo(
    () => [...new Set(subscriberTags.filter((t) => !segmentKeySet.has(t) && t !== "all"))].sort(),
    [subscriberTags, segmentKeySet],
  );

  const timeline = useMemo(
    () => buildTimeline(subscriber, history, data, formNames),
    [subscriber, history, data, formNames],
  );
  const filterCounts = useMemo(() => {
    const counts = new Map<TimelineFilter, number>([["all", timeline.length]]);
    for (const item of timeline) {
      const f = FILTER_OF[item.kind];
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    return counts;
  }, [timeline]);
  const visible = timeline.filter((i) => filter === "all" || FILTER_OF[i.kind] === filter);
  const shown = showAll ? visible : visible.slice(0, 40);
  const days = useMemo(() => {
    const out: { key: string; label: string; items: TimelineItem[] }[] = [];
    for (const item of shown) {
      const key = dayKey(item.at);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(item);
      else out.push({ key, label: dayFormat.format(new Date(item.at)), items: [item] });
    }
    return out;
  }, [shown]);

  const statusHistory = history.filter((h) => h.kind === "status");

  const summary = data.engagement?.summary;
  const tier = TIER[summary?.tier ?? "none"];
  const profile = data.profile;
  const paid = (profile?.purchases ?? []).filter((p) => p.paymentStatus === "paid");
  const currencies = new Set(paid.map((p) => p.currency ?? ""));
  const paidTotal =
    paid.length > 0 && currencies.size === 1 && paid.every((p) => p.amountCents != null)
      ? formatMoney(
          paid.reduce((sum, p) => sum + (p.amountCents ?? 0), 0),
          paid[0].currency ?? "EUR",
        )
      : null;
  const lastActivity = timeline.find((i) => i.kind !== "signup" && i.kind !== "status" && i.kind !== "groups");
  const category = sourceCategory(subscriber.source);

  function toggleSubscription() {
    const next = subscriber.status === "subscribed" ? "unsubscribed" : "subscribed";
    if (next === "unsubscribed" && !confirm(`Отписване на ${subscriber.email}? Планираните писма се спират.`)) {
      return;
    }
    startTransition(async () => {
      const res = await updateSubscriber({ id: subscriber.id, status: next });
      setNote(
        res.ok
          ? { ok: true, text: next === "subscribed" ? "Абониран е отново." : "Отписан е." }
          : { ok: false, text: res.message ?? "Не успях." },
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={backPending}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {backPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          Всички контакти
        </button>
        <div className="flex flex-wrap gap-2">
          {profile?.contact.contactId && (
            <AdminNavLink
              href={`/admin/contacts/${profile.contact.contactId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
            >
              Journey в Контакти <ExternalLink className="h-3.5 w-3.5" />
            </AdminNavLink>
          )}
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
          >
            <Pencil className="h-3.5 w-3.5" /> Име и групи
          </button>
          <button
            type="button"
            onClick={toggleSubscription}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5 disabled:opacity-60"
          >
            {subscriber.status === "subscribed" ? (
              <>
                <UserMinus className="h-3.5 w-3.5" /> Отпиши
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" /> Абонирай отново
              </>
            )}
          </button>
        </div>
      </div>

      {note && <Alert variant={note.ok ? "success" : "warning"}>{note.text}</Alert>}
      {data.partial && (
        <Alert variant="warning">
          Част от статистиката не се зареди (имейли или Zoom). Презареди след малко.
        </Alert>
      )}

      {/* Who this is */}
      <section className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 items-start gap-5">
            <span
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-semibold",
                subscriber.status === "subscribed" ? "bg-forest-600 text-cream" : "bg-ink/10 text-ink-soft",
              )}
              aria-hidden
            >
              {personInitials(name, subscriber.email)}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold leading-tight text-ink">
                {name || subscriber.email}
              </h1>
              <div className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
                <a href={`mailto:${subscriber.email}`} className="inline-flex w-fit items-center gap-2 hover:text-forest-700">
                  <Mail className="h-4 w-4" /> {subscriber.email}
                </a>
                {subscriber.phone && (
                  <a href={`tel:${subscriber.phone}`} className="inline-flex w-fit items-center gap-2 hover:text-forest-700">
                    <Phone className="h-4 w-4" /> {subscriber.phone}
                  </a>
                )}
                {subscriber.facebook_url && (
                  <a
                    href={
                      subscriber.facebook_url.startsWith("http")
                        ? subscriber.facebook_url
                        : `https://${subscriber.facebook_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-2 hover:text-forest-700"
                  >
                    <ExternalLink className="h-4 w-4" /> Facebook
                  </a>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    subscriber.status === "subscribed"
                      ? "bg-forest-500/15 text-forest-700"
                      : "bg-ink/10 text-ink-soft",
                  )}
                >
                  {subscriber.status === "subscribed" ? "Абониран" : "Отписан"}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", tier.className)} title={tier.hint}>
                  {tier.label}
                </span>
                <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {subscriber.locale === "en" ? "Английски" : "Български"}
                </span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Добавен</dt>
                  <dd className="text-ink">{formatDateTime(subscriber.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Откъде</dt>
                  <dd className="text-ink">
                    {sourceLabel(subscriber.source, formNames)}
                    {category !== "other" && sourceLabel(subscriber.source, formNames) !== SOURCE_CATEGORY_LABELS[category] && (
                      <span className="text-ink-soft"> · {SOURCE_CATEGORY_LABELS[category]}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Current status */}
          <div
            className={cn(
              "flex flex-col justify-between gap-4 rounded-2xl border p-5",
              status ? statusColorClasses(status.color).soft : "border-dashed border-ink/15 bg-cream/40",
            )}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Статус</p>
              <div className="mt-2">
                {status ? (
                  <StatusBadge name={status.name} color={status.color} size="md" />
                ) : (
                  <p className="text-sm text-ink-soft">Още няма статус.</p>
                )}
              </div>
              {subscriber.crm_status_changed_at && (
                <p className="mt-3 text-sm text-ink">
                  <span className="font-semibold">{subscriber.crm_status_changed_by || "Някой"}</span>{" "}
                  <span className="text-ink-soft">· {formatDateTime(subscriber.crm_status_changed_at)}</span>
                </p>
              )}
              {subscriber.crm_status_comment && (
                <blockquote className="mt-2 whitespace-pre-line rounded-xl bg-white/70 px-3 py-2 text-sm leading-relaxed text-ink">
                  {subscriber.crm_status_comment}
                </blockquote>
              )}
            </div>
            {statusesAvailable ? (
              <button
                type="button"
                onClick={() => setStatusOpen(true)}
                disabled={statuses.length === 0}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-semibold text-cream hover:bg-forest-700 disabled:opacity-50"
              >
                <BadgeCheck className="h-4 w-4" />
                {status ? "Смени статуса" : "Сложи статус"}
              </button>
            ) : (
              <p className="text-xs text-ink-soft">Статусите се включват с миграция 088.</p>
            )}
          </div>
        </div>
      </section>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={Mail}
          label="Имейли"
          value={summary?.emailsSent ?? 0}
          sub={summary && summary.emailsSent > 0 ? `${summary.emailsOpened} отворени · ${summary.openRate}%` : "още няма"}
        />
        <Kpi
          icon={MousePointerClick}
          label="Кликове"
          value={summary?.totalClicks ?? 0}
          sub={summary && summary.totalClicks > 0 ? `в ${plural(summary.emailsWithClicks, "имейл", "имейла")}` : "няма"}
        />
        <Kpi
          icon={Video}
          label="Zoom"
          value={profile?.zoomSessions.length ?? 0}
          sub={
            profile && profile.zoomSessions.length > 0
              ? `${profile.contact.zoomTotalMinutes} мин. общо`
              : "не е влизал"
          }
        />
        <Kpi
          icon={CreditCard}
          label="Покупки"
          value={paid.length}
          sub={paidTotal ?? (paid.length === 0 ? "няма" : undefined)}
          tone={paid.length > 0 ? "text-coral-700" : "text-ink"}
        />
        <Kpi
          icon={FileText}
          label="Форми"
          value={profile?.formSubmissions.length ?? 0}
          sub={profile?.formSubmissions[0]?.formName ?? "не е попълвал"}
        />
        <Kpi
          icon={Sparkles}
          label="Последно"
          value={<span className="text-lg">{lastActivity ? formatShortDate(lastActivity.at) : "-"}</span>}
          sub={lastActivity?.title}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* History */}
        <Panel title="История" icon={CalendarPlus}>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as TimelineFilter[])
              .filter((f) => f === "all" || filterCounts.get(f))
              .map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                    setShowAll(false);
                  }}
                  aria-pressed={filter === f}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filter === f ? "bg-forest-600 text-cream" : "bg-ink/5 text-ink-soft hover:bg-ink/10",
                  )}
                >
                  {FILTER_LABELS[f]}{" "}
                  <span className="opacity-70 [font-variant-numeric:tabular-nums]">{filterCounts.get(f) ?? 0}</span>
                </button>
              ))}
          </div>

          {days.length === 0 ? (
            <p className="rounded-xl bg-cream/50 px-4 py-6 text-center text-sm text-ink-soft">
              Няма записи в този изглед.
            </p>
          ) : (
            <div className="space-y-6">
              {days.map((day) => (
                <div key={day.key}>
                  <p className="sticky top-0 z-[1] mb-3 bg-white/95 py-1 text-xs font-semibold uppercase tracking-wider text-ink-soft backdrop-blur first-letter:uppercase">
                    {day.label}
                  </p>
                  <ol className="relative space-y-4 border-l border-ink/10 pl-6">
                    {day.items.map((item) => {
                      const Icon = KIND_ICON[item.kind];
                      return (
                        <li key={item.id} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[37px] top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white",
                              item.kind === "status" && item.statusColor
                                ? cn(statusColorClasses(item.statusColor).dot, "text-white")
                                : KIND_TONE[item.kind],
                            )}
                            aria-hidden
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <p className="font-medium leading-snug text-ink">{item.title}</p>
                            <p className="text-xs text-ink-soft [font-variant-numeric:tabular-nums]">
                              {timeFormat.format(new Date(item.at))}
                            </p>
                          </div>
                          {(item.meta || item.actor) && (
                            <p className="mt-0.5 text-sm text-ink-soft">
                              {[item.meta, item.actor && item.kind !== "sync" ? `от ${item.actor}` : item.actor]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {item.comment && (
                            <blockquote className="mt-2 whitespace-pre-line rounded-xl border border-ink/10 bg-cream/40 px-3 py-2 text-sm leading-relaxed text-ink">
                              {item.comment}
                            </blockquote>
                          )}
                          {((item.added?.length ?? 0) > 0 || (item.removed?.length ?? 0) > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.added?.map((t) => <TagChip key={`a-${t}`} name={groupLabel(t)} tone="added" />)}
                              {item.removed?.map((t) => <TagChip key={`r-${t}`} name={groupLabel(t)} tone="removed" />)}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
              {visible.length > shown.length && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="w-full rounded-xl border border-ink/10 py-2.5 text-sm font-medium text-forest-700 hover:bg-forest-50"
                >
                  Покажи още {visible.length - shown.length}
                </button>
              )}
            </div>
          )}
          {history.length === 0 && statusesAvailable && (
            <p className="mt-5 text-xs text-ink-soft">
              Смените на статус и групи се пазят от днес нататък - по-старите промени не са
              записани.
            </p>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Групи"
            icon={FolderTree}
            action={
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-forest-700 hover:bg-forest-50"
              >
                <Pencil className="h-3 w-3" /> Редактирай
              </button>
            }
          >
            {chips.length === 0 && interests.length === 0 ? (
              <p className="text-sm text-ink-soft">Не е в нито една група.</p>
            ) : (
              <div className="space-y-4">
                {interests.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      Интерес
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((label) => (
                        <TagChip key={label} name={label} tone="gold" />
                      ))}
                    </div>
                  </div>
                )}
                {chipsBySegment.map(([segmentName, list]) => (
                  <div key={segmentName || "-"}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      {segmentName || "Други групи"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((chip) => (
                        <TagChip key={chip.key} name={chip.name} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {quiet.length > 0 && (
              <p className="mt-4 border-t border-ink/5 pt-3 text-xs text-ink-soft">
                Служебни етикети: {quiet.map((q) => q.name).join(", ")}
              </p>
            )}
          </Panel>

          <Panel title="Статуси" icon={BadgeCheck}>
            {statusHistory.length === 0 ? (
              <p className="text-sm text-ink-soft">Статусът още не е сменян.</p>
            ) : (
              <ol className="space-y-3">
                {statusHistory.map((h) => (
                  <li key={h.id} className="rounded-xl border border-ink/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {h.status_name ? (
                        <StatusBadge name={h.status_name} color={h.status_color} />
                      ) : (
                        <span className="text-xs font-medium text-ink-soft">Без статус</span>
                      )}
                      <span className="text-xs text-ink-soft [font-variant-numeric:tabular-nums]">
                        {formatDateTime(h.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-soft">
                      от <span className="font-semibold text-ink">{h.actor_name || "-"}</span>
                      {h.previous_status_name ? ` · преди: ${h.previous_status_name}` : ""}
                    </p>
                    {h.comment && (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{h.comment}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {profile && profile.purchases.length > 0 && (
            <Panel title="Покупки" icon={CreditCard}>
              <ul className="space-y-2">
                {profile.purchases.map((p) => (
                  <li
                    key={`${p.productTitle}-${p.purchasedAt}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-cream/40 px-3 py-2"
                  >
                    <span className="min-w-0 font-medium text-ink">{p.productTitle}</span>
                    <span className="text-xs text-ink-soft">
                      {p.paymentStatus === "paid"
                        ? p.amountCents != null && p.currency
                          ? formatMoney(p.amountCents, p.currency)
                          : "платено"
                        : p.paymentStatus === "refunded"
                          ? "върнато"
                          : "неуспешно"}{" "}
                      · {formatShortDate(p.purchasedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {profile && profile.zoomSessions.length > 0 && (
            <Panel title="Zoom" icon={Video}>
              <ul className="space-y-3">
                {profile.zoomSessions.map((z, i) => (
                  <li key={`${z.leftAt}-${i}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{z.title || "Zoom сесия"}</span>
                      <span className="text-xs text-ink-soft">
                        {formatShortDate(z.joinedAt ?? z.leftAt)} · {z.durationMinutes} мин.
                      </span>
                    </div>
                    {typeof z.stayPct === "number" && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-50">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${Math.max(2, Math.min(100, z.stayPct))}%` }}
                          title={`${z.stayPct}% от сесията`}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      {profile && profile.formSubmissions.length > 0 && (
        <Panel title={`Отговори от форми (${profile.formSubmissions.length})`} icon={FileText}>
          <div className="grid gap-4 xl:grid-cols-2">
            {profile.formSubmissions.map((form) => (
              <article key={`${form.formName}-${form.submittedAt}`} className="rounded-2xl border border-ink/10 p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-ink">{form.formName}</h3>
                  <span className="text-xs text-ink-soft">{formatDateTime(form.submittedAt)}</span>
                </div>
                <dl className="space-y-2.5">
                  {form.rows.map((row, i) => (
                    <div key={`${row.label}-${i}`}>
                      <dt className="text-xs font-medium text-ink-soft">{row.label}</dt>
                      <dd className="whitespace-pre-line text-sm text-ink">{row.value || "-"}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title={`Имейли (${data.engagement?.emails.length ?? 0})`}
        icon={MailOpen}
      >
        <p className="-mt-2 mb-4 text-sm text-ink-soft">
          Кампании, автоматизации и напомняния - изпратени, планирани и неуспешни.
        </p>
        <PersonEmailsTable emails={data.engagement?.emails ?? []} />
      </Panel>

      {statusOpen && (
        <ContactStatusDialog
          ids={[subscriber.id]}
          title={status ? "Смени статуса" : "Сложи статус"}
          subtitle={name ? `${name} · ${subscriber.email}` : subscriber.email}
          statuses={statuses}
          currentStatusId={subscriber.crm_status_id ?? null}
          onClose={() => setStatusOpen(false)}
          onSaved={(text) => {
            setStatusOpen(false);
            setNote({ ok: true, text });
            router.refresh();
          }}
        />
      )}

      {editOpen && (
        <SubscriberEditDialog
          subscriber={subscriber}
          segments={segments}
          groups={groups}
          customTagOptions={customTagOptions}
          onClose={() => setEditOpen(false)}
          onSaved={(text) => {
            setEditOpen(false);
            setNote({ ok: true, text });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
