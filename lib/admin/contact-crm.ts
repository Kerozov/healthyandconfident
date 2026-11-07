/**
 * Client-safe helpers for the contacts screen: status colours, where a person
 * came from, and how their groups are shown. No database access here.
 */

import type { Segment, SegmentGroup } from "@/lib/supabase/types";
import { SCHEDULE_TIMEZONE } from "@/lib/datetime";

/** sessionStorage key: the list view (filters, page) to return to from a profile. */
export const CONTACTS_LIST_URL_KEY = "hc:contacts:list-url";

// ── Status colours ──────────────────────────────────────────

export const STATUS_COLOR_KEYS = [
  "slate",
  "sky",
  "violet",
  "amber",
  "emerald",
  "coral",
  "rose",
] as const;

export type StatusColor = (typeof STATUS_COLOR_KEYS)[number];

/** Full class strings, written out so Tailwind keeps them. */
export const STATUS_COLORS: Record<
  StatusColor,
  { label: string; badge: string; dot: string; soft: string }
> = {
  slate: {
    label: "Сив",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    soft: "bg-slate-50 border-slate-200",
  },
  sky: {
    label: "Син",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    soft: "bg-sky-50/60 border-sky-200",
  },
  violet: {
    label: "Лилав",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    dot: "bg-violet-500",
    soft: "bg-violet-50/60 border-violet-200",
  },
  amber: {
    label: "Жълт",
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    soft: "bg-amber-50/60 border-amber-200",
  },
  emerald: {
    label: "Зелен",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    soft: "bg-emerald-50/60 border-emerald-200",
  },
  coral: {
    label: "Оранжев",
    badge: "bg-coral-500/10 text-coral-700 ring-coral-300/60",
    dot: "bg-coral-500",
    soft: "bg-coral-500/5 border-coral-300/60",
  },
  rose: {
    label: "Червен",
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    soft: "bg-rose-50/60 border-rose-200",
  },
};

export function normalizeStatusColor(value: string | null | undefined): StatusColor {
  return (STATUS_COLOR_KEYS as readonly string[]).includes(value ?? "")
    ? (value as StatusColor)
    : "slate";
}

export function statusColorClasses(value: string | null | undefined) {
  return STATUS_COLORS[normalizeStatusColor(value)];
}

// ── Where the person came from ──────────────────────────────

export const SOURCE_CATEGORIES = [
  "form",
  "popup",
  "launchify",
  "site",
  "import",
  "purchase",
  "manual",
  "other",
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  form: "Въпросник / форма",
  popup: "Popup",
  launchify: "Launchify",
  site: "Бутон на сайта",
  import: "Импорт",
  purchase: "Покупка",
  manual: "Ръчно добавен",
  other: "Друго",
};

const SITE_PLACEMENT_LABELS: Record<string, string> = {
  hero: "горната секция",
  "nav-header": "менюто",
  "nav-mobile": "мобилното меню",
  "final-cta": "последния бутон",
  "free-menu-banner": "банера за безплатно меню",
};

export function sourceCategory(source: string | null | undefined): SourceCategory {
  const s = (source ?? "").trim().toLowerCase();
  if (!s || s === "system") return "other";
  if (s.startsWith("form:")) return "form";
  if (s.includes("popup")) return "popup";
  if (s.includes("launchify") || s.includes("funnel")) return "launchify";
  if (s === "import") return "import";
  if (s === "purchase") return "purchase";
  if (s === "manual") return "manual";
  return "site";
}

/** „Въпросник „Енергия““, „Сайт · менюто“ — readable, with the form's real name. */
export function sourceLabel(
  source: string | null | undefined,
  formNames: Record<string, string> = {},
): string {
  const raw = (source ?? "").trim();
  const category = sourceCategory(raw);
  if (category === "form") {
    const slug = raw.slice(5).trim();
    return `Въпросник „${formNames[slug] ?? slug}“`;
  }
  if (category === "site") {
    const placement = SITE_PLACEMENT_LABELS[raw.toLowerCase()];
    if (placement) return `Сайт · ${placement}`;
    if (raw.startsWith("program-")) return `Сайт · програма ${raw.slice(8)}`;
    return `Сайт · ${raw}`;
  }
  if (category === "other") return raw || "-";
  return SOURCE_CATEGORY_LABELS[category];
}

// ── Groups ──────────────────────────────────────────────────

/**
 * Tags that are bookkeeping, not a group a person is "in": the source
 * markers and the catch-all. They stay on the record (campaigns can target
 * them) but the compact table does not spend space on them.
 */
const QUIET_TAGS = new Set(["all", "manual", "launchifybg", "funnel-brand", "en"]);

export type GroupChip = {
  key: string;
  name: string;
  /** Name of the segment the group sits under, if any. */
  segmentName: string | null;
};

export function groupChipsForTags(
  tags: string[],
  segments: Segment[],
  groups: SegmentGroup[],
): { chips: GroupChip[]; quiet: GroupChip[] } {
  const segmentByKey = new Map(segments.map((s) => [s.key, s]));
  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
  const chips: GroupChip[] = [];
  const quiet: GroupChip[] = [];
  for (const tag of tags) {
    if (!tag) continue;
    const segment = segmentByKey.get(tag);
    const chip: GroupChip = {
      key: tag,
      name: segment?.name ?? tag,
      segmentName: segment?.group_id ? (groupNameById.get(segment.group_id) ?? null) : null,
    };
    if (QUIET_TAGS.has(tag) || tag.startsWith("guide:")) quiet.push(chip);
    else chips.push(chip);
  }
  // Groups that sit under a segment first — they are the ones people curate.
  chips.sort((a, b) => {
    if (!!a.segmentName !== !!b.segmentName) return a.segmentName ? -1 : 1;
    return a.name.localeCompare(b.name, "bg");
  });
  return { chips, quiet };
}

/** Initials for the avatar circle. */
export function personInitials(name: string | null | undefined, email: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return email.slice(0, 1).toUpperCase();
}

export function personDisplayName(s: {
  first_name: string | null;
  last_name: string | null;
  name: string | null;
}): string {
  return [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || "";
}

// Fixed zone: the server (UTC) and the browser must print the same day.
const shortDate = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SCHEDULE_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SCHEDULE_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : shortDate.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : dateTime.format(d);
}
