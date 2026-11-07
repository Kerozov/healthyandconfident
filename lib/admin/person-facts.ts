import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { PersonFormSubmission } from "@/lib/admin/person-profile";
import type { Subscriber } from "@/lib/supabase/types";

/**
 * Everything we know about one person, from wherever it came: the profile
 * itself, the site's questionnaires, Launchify answers and old imports. Long
 * questions are boiled down to a short tag („Килограми“, „Проблем“…), and the
 * same answer from two places is shown once with both sources.
 */

export type FactSourceKind = "profile" | "form" | "launchify" | "import";

export type PersonFact = {
  /** Canonical key („weight“…) or "other". */
  key: string;
  /** Short tag shown on the chip. */
  label: string;
  /** The question as it was asked — for the tooltip. */
  question: string;
  value: string;
  sources: { kind: FactSourceKind; label: string }[];
  /** Too long for a chip — shown as a quote instead. */
  long: boolean;
};

export type PersonFacts = {
  main: PersonFact[];
  other: PersonFact[];
};

type Canon = { key: string; label: string; re: RegExp };

/**
 * In the order the chips are shown. `\b` only knows Latin letters, so Cyrillic
 * whole words use `(?<!\p{L})…(?!\p{L})` with the `u` flag.
 */
const CANON: Canon[] = [
  { key: "phone", label: "Телефон", re: /телефон|phone|(?<!\p{L})тел(?!\p{L})|\bgsm\b|мобилен/iu },
  { key: "facebook", label: "Facebook", re: /facebook|фейсбук|\bfb\b/i },
  { key: "age", label: "Възраст", re: /възраст|\bage\b|на колко години/i },
  { key: "weight", label: "Килограми", re: /(?<!\p{L})кг(?!\p{L})|килограм|\bkg\b|тегло|weight/iu },
  { key: "height", label: "Ръст", re: /ръст|височина|height/i },
  { key: "problem", label: "Проблем", re: /проблем|искате да се справите|искаш да се справиш|problem|оплакван|състояни|диагноза/i },
  { key: "ailments", label: "Неразположения", re: /неразположени|симптом/i },
  { key: "diseases", label: "Заболявания", re: /заболяван|болест|лекарств/i },
  { key: "difficulty", label: "Трудности", re: /затрудн|трудно|пречи/i },
  { key: "goal", label: "Цел", re: /(?<!\p{L})цел(?!\p{L})|целта|постигнеш|постигнете|\bgoal/iu },
  { key: "motivation", label: "Мотивация", re: /мотивир|motivat/i },
  { key: "why_now", label: "Защо сега", re: /защо.*готов|why now/i },
  { key: "profession", label: "Професия", re: /професия|работите|profession|occupation/i },
  { key: "budget", label: "Бюджет", re: /сума|инвестира|бюджет|budget/i },
  { key: "heard", label: "Откъде е чул", re: /разбрахте|разбра за|от къде|откъде|how did you hear/i },
  { key: "interest", label: "Интерес", re: /информация.*полезн|интересува|интерес/i },
  { key: "message", label: "Съобщение", re: /^съобщение$|^message$|коментар/i },
  { key: "ticket", label: "Билет", re: /билет|ticket/i },
];

const SKIP_LABEL = /^(име|фамилия|имейл|e-?mail|email|name|first ?name|last ?name|презиме)$/i;
const CONSENT_LABEL = /съглас|consent|gdpr|поверителност|условията/i;

/**
 * Questionnaires ask long questions with a story in front. Only the question
 * itself — the last sentence — decides the tag, or a passing „тегло“ in the
 * story would make every question „Килограми“.
 */
function questionPart(label: string): string {
  const parts = label
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (parts[i].replace(/[^\p{L}\p{N}]/gu, "").length >= 6) return parts[i];
  }
  return label.trim();
}

/**
 * The order the tags are tried in — the specific before the general: „каква
 * сума… да постигнете резултати“ is a budget, not a goal, and „затруднява при
 * справянето“ is a difficulty, not the problem itself.
 */
const MATCH_ORDER = [
  "phone",
  "facebook",
  "age",
  "height",
  "weight",
  "budget",
  "motivation",
  "why_now",
  "heard",
  "profession",
  "ailments",
  "diseases",
  "difficulty",
  "problem",
  "goal",
  "interest",
  "message",
  "ticket",
].map((key) => CANON.find((c) => c.key === key)!);

function canonOf(label: string): Canon | null {
  const q = questionPart(label);
  return MATCH_ORDER.find((c) => c.re.test(q)) ?? null;
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A short question stands on its own; „Така ли е при Вас?“ needs the start of the story. */
function shortLabel(label: string): string {
  const q = questionPart(label).replace(/\s*\*$/, "");
  if (q.length < 25 && label.trim().length > q.length + 10) {
    return clip(label.replace(/\s+/g, " ").trim(), 70);
  }
  return clip(q, 70);
}

/** `phone_number` / `fbProfile` from an API → „Phone number“ / „Fb profile“. */
function prettyKey(key: string): string {
  if (/\s/.test(key)) return key.trim();
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function sameValueKey(key: string, value: string): string {
  if (key === "phone") return value.replace(/\D/g, "").slice(-9);
  if (key === "facebook") {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^(www\.|m\.)/, "").replace(/\/+$/, "");
  }
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

type RawFact = {
  question: string;
  value: string;
  source: { kind: FactSourceKind; label: string };
};

export type StoredFact = {
  source: string;
  source_label: string;
  label: string;
  value: string;
  updated_at: string;
};

export async function getSubscriberFacts(subscriberId: string): Promise<StoredFact[]> {
  const { data, error } = await getAdminClient()
    .from("subscriber_facts")
    .select("source, source_label, label, value, updated_at")
    .eq("subscriber_id", subscriberId)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data as StoredFact[]) ?? [];
}

/** `Проблем: ИР · Килограми: 12` — how imports keep columns the app has no field for. */
function factsFromNotes(notes: string | null): RawFact[] {
  if (!notes?.trim()) return [];
  const out: RawFact[] = [];
  for (const part of notes.split(" · ")) {
    const text = part.trim();
    if (!text) continue;
    const match = text.match(/^([^:]{1,60}):\s*(.+)$/);
    out.push({
      question: match ? match[1].trim() : "Бележка",
      value: match ? match[2].trim() : text,
      source: { kind: "import", label: "Импорт / бележки" },
    });
  }
  return out;
}

export function buildPersonFacts(input: {
  subscriber: Pick<Subscriber, "phone" | "facebook_url" | "notes">;
  formSubmissions: PersonFormSubmission[];
  stored: StoredFact[];
}): PersonFacts {
  const raw: RawFact[] = [];
  const { subscriber } = input;

  if (subscriber.phone?.trim()) {
    raw.push({ question: "Телефон", value: subscriber.phone.trim(), source: { kind: "profile", label: "Профил" } });
  }
  if (subscriber.facebook_url?.trim()) {
    raw.push({ question: "Facebook", value: subscriber.facebook_url.trim(), source: { kind: "profile", label: "Профил" } });
  }

  for (const f of input.stored) {
    const kind: FactSourceKind = f.source === "launchify" ? "launchify" : "import";
    raw.push({
      question: prettyKey(f.label),
      value: f.value,
      source: {
        kind,
        label: kind === "launchify" ? `Launchify${f.source_label ? ` · ${f.source_label}` : ""}` : f.source_label || "Импорт",
      },
    });
  }

  for (const form of input.formSubmissions) {
    for (const row of form.rows) {
      raw.push({ question: row.label, value: row.value, source: { kind: "form", label: `Въпросник „${form.formName}“` } });
    }
  }

  raw.push(...factsFromNotes(subscriber.notes));

  const merged = new Map<string, PersonFact>();
  for (const r of raw) {
    const value = r.value.replace(/\s+\n/g, "\n").trim();
    if (!value || value === "-") continue;
    const question = r.question.trim();
    if (SKIP_LABEL.test(question)) continue;
    if (CONSENT_LABEL.test(question) && /^(да|yes|true|не|no|false)$/i.test(value)) continue;

    const canon = canonOf(question);
    const key = canon?.key ?? "other";
    const label = canon?.label ?? shortLabel(question);
    const id = `${key === "other" ? `other:${label.toLowerCase()}` : key}|${sameValueKey(key, value)}`;
    const existing = merged.get(id);
    if (existing) {
      if (!existing.sources.some((s) => s.label === r.source.label)) existing.sources.push(r.source);
      continue;
    }
    merged.set(id, {
      key,
      label,
      question,
      value,
      sources: [r.source],
      long: value.length > 70 || value.includes("\n"),
    });
  }

  const order = new Map(CANON.map((c, i) => [c.key, i]));
  const all = [...merged.values()];
  return {
    main: all
      .filter((f) => f.key !== "other")
      .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99)),
    other: all.filter((f) => f.key === "other"),
  };
}
