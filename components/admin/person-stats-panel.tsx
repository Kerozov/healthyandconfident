"use client";

import Link from "next/link";
import {
  CreditCard,
  FileText,
  Mail,
  MousePointerClick,
  Video,
} from "lucide-react";
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
import { PersonEmailsTable } from "@/components/admin/person-emails-table";
import { CountUp } from "@/components/admin/charts";
import { formatMoney } from "@/lib/money";
import { cn, formatDate } from "@/lib/utils";

export type PersonStatsDetail = {
  summary: EmailEngagementSummary;
  emails: PersonEmailItem[];
  activity: EngagementActivityItem[];
  clickEvents: ClickEventItem[];
  profile: {
    contact: ContactSummary;
    purchases: PersonPurchase[];
    formSubmissions: PersonFormSubmission[];
    zoomSessions: PersonZoomSession[];
  };
};

const TIER: Record<
  EmailEngagementSummary["tier"],
  { label: string; className: string }
> = {
  hot: { label: "Горещ", className: "bg-coral-500/15 text-coral-700" },
  warm: { label: "Топъл", className: "bg-gold-400/25 text-amber-900" },
  cold: { label: "Хладен", className: "bg-sky-100 text-sky-800" },
  none: { label: "Без реакция", className: "bg-ink/5 text-ink-soft" },
};

type FeedItem = {
  at: string;
  kind: "email" | "click" | "zoom" | "purchase" | "form";
  title: string;
  note?: string;
};

const FEED_ICON = {
  email: Mail,
  click: MousePointerClick,
  zoom: Video,
  purchase: CreditCard,
  form: FileText,
} as const;

const FEED_TONE = {
  email: "bg-forest-100 text-forest-700",
  click: "bg-sky-100 text-sky-800",
  zoom: "bg-gold-400/25 text-amber-900",
  purchase: "bg-coral-500/15 text-coral-700",
  form: "bg-ink/5 text-ink-soft",
} as const;

function buildFeed(detail: PersonStatsDetail): FeedItem[] {
  const items: FeedItem[] = [];
  for (const a of detail.activity) {
    items.push({
      at: a.sentAt,
      kind: "email",
      title: a.title,
      note: a.clicks > 0 ? "отворен и кликнат" : a.opened ? "отворен" : "не е отворен",
    });
  }
  for (const c of detail.clickEvents) {
    items.push({
      at: c.clickedAt,
      kind: "click",
      title: c.linkLabel || c.targetUrl || "Линк",
      note: c.sourceTitle,
    });
  }
  for (const z of detail.profile.zoomSessions) {
    items.push({
      at: z.joinedAt ?? z.leftAt,
      kind: "zoom",
      title: z.title || "Zoom сесия",
      note: `${z.durationMinutes} мин.${
        typeof z.stayPct === "number" ? ` · ${z.stayPct}% от сесията` : ""
      }`,
    });
  }
  for (const p of detail.profile.purchases) {
    items.push({
      at: p.purchasedAt,
      kind: "purchase",
      title: p.productTitle,
      note:
        p.paymentStatus === "paid"
          ? p.amountCents != null && p.currency
            ? formatMoney(p.amountCents, p.currency)
            : "платено"
          : p.paymentStatus === "refunded"
            ? "възстановено"
            : "неуспешно",
    });
  }
  for (const f of detail.profile.formSubmissions) {
    items.push({ at: f.submittedAt, kind: "form", title: f.formName, note: "попълнена форма" });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

function MiniStat({
  icon: Icon,
  label,
  children,
  sub,
  delay,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
  sub?: string;
  delay: number;
}) {
  return (
    <div
      className="animate-fade-up rounded-2xl border border-ink/10 bg-white p-4 motion-reduce:animate-none"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink [font-variant-numeric:tabular-nums]">
        {children}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}

/** Everything known about one person: emails, clicks, Zoom, purchases, forms. */
export function PersonStatsPanel({
  email,
  name,
  detail,
}: {
  email: string;
  name?: string | null;
  detail: PersonStatsDetail;
}) {
  const { summary, profile } = detail;
  const tier = TIER[summary.tier];
  const paid = profile.purchases.filter((p) => p.paymentStatus === "paid");
  const currencies = new Set(paid.map((p) => p.currency ?? ""));
  const paidTotal =
    currencies.size === 1 && paid.every((p) => p.amountCents != null)
      ? paid.reduce((sum, p) => sum + (p.amountCents ?? 0), 0)
      : null;
  const feed = buildFeed(detail);
  const initials = (name || email).trim().slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-600 font-display text-lg font-semibold text-white"
            aria-hidden
          >
            {initials}
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">{name || email}</p>
            {name && <p className="text-xs text-ink-soft">{email}</p>}
            {profile.contact.contactId && (
              <Link
                href={`/admin/contacts/${profile.contact.contactId}`}
                className="text-xs font-medium text-forest-700 hover:underline"
              >
                Отвори journey в Контакти →
              </Link>
            )}
          </div>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", tier.className)}>
          {tier.label}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          icon={Mail}
          label="Имейли"
          delay={0}
          sub={`${summary.emailsOpened} отворени от ${summary.emailsSent} · ${summary.openRate}%`}
        >
          <CountUp value={summary.emailsSent} />
        </MiniStat>
        <MiniStat
          icon={MousePointerClick}
          label="Кликове"
          delay={60}
          sub={`в ${summary.emailsWithClicks} имейла`}
        >
          <CountUp value={summary.totalClicks} />
        </MiniStat>
        <MiniStat
          icon={Video}
          label="Zoom"
          delay={120}
          sub={
            profile.zoomSessions.length > 0
              ? `${profile.contact.zoomTotalMinutes} мин. общо`
              : "не е участвал"
          }
        >
          <CountUp value={profile.zoomSessions.length} />{" "}
          <span className="text-sm font-normal text-ink-soft">сесии</span>
        </MiniStat>
        <MiniStat
          icon={CreditCard}
          label="Покупки"
          delay={180}
          sub={
            paidTotal !== null && paid.length > 0
              ? formatMoney(paidTotal, paid[0].currency ?? "GBP")
              : paid.length === 0
                ? "няма"
                : undefined
          }
        >
          <CountUp value={paid.length} />
        </MiniStat>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">Хронология</p>
          {feed.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Още няма записани имейли или активност за този човек.
            </p>
          ) : (
            <ol className="relative space-y-3 border-l border-ink/10 pl-5">
              {feed.map((item, i) => {
                const Icon = FEED_ICON[item.kind];
                return (
                  <li
                    key={`${item.kind}-${item.at}-${i}`}
                    className="animate-fade-up relative motion-reduce:animate-none"
                    style={{ animationDelay: `${Math.min(i * 40, 600)}ms` }}
                  >
                    <span
                      className={cn(
                        "absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-cream-2/60",
                        FEED_TONE[item.kind],
                      )}
                      aria-hidden
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-ink-soft">
                      {formatDate(item.at, "bg")}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="space-y-6">
          {profile.zoomSessions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Zoom сесии</p>
              <ul className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
                {profile.zoomSessions.map((z, i) => (
                  <li key={`${z.leftAt}-${i}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{z.title || "Zoom сесия"}</span>
                      <span className="text-xs text-ink-soft">
                        {formatDate(z.joinedAt ?? z.leftAt, "bg")} · {z.durationMinutes} мин.
                      </span>
                    </div>
                    {typeof z.stayPct === "number" && (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-forest-50">
                        <div
                          className="animate-grow-x h-full rounded-full bg-forest-600"
                          style={{ width: `${Math.max(2, z.stayPct)}%` }}
                          title={`${z.stayPct}% от сесията`}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.purchases.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Покупки</p>
              <ul className="space-y-2 rounded-xl border border-ink/10 bg-white p-3">
                {profile.purchases.map((purchase) => (
                  <li
                    key={`${purchase.productTitle}-${purchase.purchasedAt}-${purchase.stripeProductId ?? ""}`}
                    className="flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <span className="font-medium">
                      {purchase.productTitle}
                      <span
                        className={cn(
                          "ml-2 rounded-full px-2 py-0.5 text-xs",
                          purchase.paymentStatus === "paid"
                            ? "bg-forest-500/15 text-forest-700"
                            : purchase.paymentStatus === "refunded"
                              ? "bg-gold-400/20 text-amber-900"
                              : "bg-coral-500/15 text-coral-700",
                        )}
                      >
                        {purchase.paymentStatus === "paid"
                          ? "Платено"
                          : purchase.paymentStatus === "refunded"
                            ? "Възстановено"
                            : "Неуспешно"}
                      </span>
                    </span>
                    <span className="text-xs text-ink-soft">
                      {purchase.amountCents != null && purchase.currency
                        ? `${formatMoney(purchase.amountCents, purchase.currency)} · `
                        : ""}
                      {formatDate(purchase.purchasedAt, "bg")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.formSubmissions.length > 0 && (
            <details className="group rounded-xl border border-ink/10 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Отговори от форми ({profile.formSubmissions.length})
              </summary>
              <div className="mt-3 space-y-3">
                {profile.formSubmissions.map((form) => (
                  <div key={`${form.formName}-${form.submittedAt}`}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="text-sm font-medium">{form.formName}</p>
                      <p className="text-xs text-ink-soft">{formatDate(form.submittedAt, "bg")}</p>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {form.rows.map((row) => (
                        <li key={`${form.formName}-${row.label}`}>
                          <span className="font-medium text-slate-700">{row.label}:</span>{" "}
                          <span className="text-ink-soft">{row.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          )}

          {detail.emails.length > 0 && (
            <details className="rounded-xl border border-ink/10 bg-white p-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                Всички имейли на човека ({detail.emails.length})
              </summary>
              <p className="mb-3 mt-2 text-xs text-ink-soft">
                Автоматизации, кампании и напомняния - изпратени, планирани и неуспешни.
              </p>
              <PersonEmailsTable emails={detail.emails} />
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
