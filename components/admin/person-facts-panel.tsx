import {
  Activity,
  AtSign,
  Briefcase,
  Cake,
  CircleAlert,
  Flame,
  HeartPulse,
  Info,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Phone,
  Ruler,
  Scale,
  Sparkles,
  Stethoscope,
  Target,
  Ticket,
  Wallet,
} from "lucide-react";
import type { FactSourceKind, PersonFact, PersonFacts } from "@/lib/admin/person-facts";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Phone> = {
  phone: Phone,
  facebook: AtSign,
  age: Cake,
  weight: Scale,
  height: Ruler,
  problem: Stethoscope,
  ailments: Activity,
  diseases: HeartPulse,
  difficulty: CircleAlert,
  goal: Target,
  motivation: Flame,
  why_now: Sparkles,
  profession: Briefcase,
  budget: Wallet,
  heard: Megaphone,
  interest: Lightbulb,
  message: MessageSquare,
  ticket: Ticket,
};

const SOURCE_TONE: Record<FactSourceKind, { dot: string; label: string }> = {
  profile: { dot: "bg-forest-500", label: "Профил" },
  form: { dot: "bg-violet-500", label: "Въпросник" },
  launchify: { dot: "bg-sky-500", label: "Launchify" },
  import: { dot: "bg-amber-500", label: "Импорт" },
};

function sourcesTitle(fact: PersonFact): string {
  return `${fact.question}\nОт: ${fact.sources.map((s) => s.label).join(", ")}`;
}

function SourceDots({ fact }: { fact: PersonFact }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
      {[...new Set(fact.sources.map((s) => s.kind))].map((kind) => (
        <span key={kind} className={cn("h-1.5 w-1.5 rounded-full", SOURCE_TONE[kind].dot)} />
      ))}
    </span>
  );
}

function FactValue({ fact }: { fact: PersonFact }) {
  if (fact.key === "phone") {
    return (
      <a href={`tel:${fact.value.replace(/[^\d+]/g, "")}`} className="hover:text-forest-700 hover:underline">
        {fact.value}
      </a>
    );
  }
  if (fact.key === "facebook" && /^(https?:\/\/|www\.|m\.)?(facebook|fb)\.com\//i.test(fact.value)) {
    const href = fact.value.startsWith("http") ? fact.value : `https://${fact.value}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-forest-700 hover:underline">
        {fact.value.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    );
  }
  return <>{fact.value}</>;
}

/** Phone, Facebook, kilograms, the problem… — as tags, with where each came from. */
export function PersonFactsPanel({ facts }: { facts: PersonFacts }) {
  const chips = facts.main.filter((f) => !f.long);
  const longMain = facts.main.filter((f) => f.long);
  const kinds = new Set([...facts.main, ...facts.other].flatMap((f) => f.sources.map((s) => s.kind)));
  const empty = facts.main.length === 0 && facts.other.length === 0;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Информация за човека
        </h2>
        {kinds.size > 0 && (
          <p className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
            {(Object.keys(SOURCE_TONE) as FactSourceKind[])
              .filter((k) => kinds.has(k))
              .map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", SOURCE_TONE[k].dot)} aria-hidden />
                  {SOURCE_TONE[k].label}
                </span>
              ))}
          </p>
        )}
      </div>

      {empty ? (
        <p className="rounded-xl bg-cream/50 px-4 py-5 text-sm text-ink-soft">
          Още няма информация. Ще се появи, когато човекът попълни въпросник, дойде от Launchify
          или бъде внесен с допълнителни колони.
        </p>
      ) : (
        <div className="space-y-5">
          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {chips.map((fact, i) => {
                const Icon = ICONS[fact.key] ?? Info;
                return (
                  <li
                    key={`${fact.key}-${i}`}
                    title={sourcesTitle(fact)}
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-ink/10 bg-cream/40 py-1.5 pl-2.5 pr-3"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-forest-600" aria-hidden />
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      {fact.label}
                    </span>
                    <span className="min-w-0 break-words text-sm font-medium text-ink">
                      <FactValue fact={fact} />
                    </span>
                    <SourceDots fact={fact} />
                  </li>
                );
              })}
            </ul>
          )}

          {longMain.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {longMain.map((fact, i) => {
                const Icon = ICONS[fact.key] ?? Info;
                return (
                  <div key={`${fact.key}-long-${i}`} className="rounded-xl border border-ink/10 p-3.5" title={fact.question}>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                      <Icon className="h-3.5 w-3.5 text-forest-600" aria-hidden />
                      {fact.label}
                      <SourceDots fact={fact} />
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{fact.value}</p>
                    <p className="mt-1.5 text-[11px] text-ink-soft">{fact.sources.map((s) => s.label).join(" · ")}</p>
                  </div>
                );
              })}
            </div>
          )}

          {facts.other.length > 0 && (
            <details className="group rounded-xl border border-ink/10">
              <summary className="cursor-pointer list-none px-3.5 py-2.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
                Други отговори ({facts.other.length})
                <span className="ml-1 text-ink-soft group-open:hidden">- покажи</span>
              </summary>
              <dl className="divide-y divide-ink/5 border-t border-ink/10">
                {facts.other.map((fact, i) => (
                  <div key={`other-${i}`} className="grid gap-1 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4">
                    <dt className="text-sm text-ink-soft" title={fact.question}>
                      {fact.label}
                      <span className="mt-0.5 block text-[11px]">{fact.sources.map((s) => s.label).join(" · ")}</span>
                    </dt>
                    <dd className="whitespace-pre-line text-sm font-medium text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
