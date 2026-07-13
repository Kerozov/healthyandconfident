import { Check, Leaf } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const TOPICS = {
  bg: [
    "Инсулинова резистентност",
    "Трайно отслабване",
    "Диабет тип 2",
    "94% успех",
    "Балансирана кръвна захар",
    "Повече енергия",
    "Увереност",
    "Без диети",
    "Холистичен подход",
  ],
  en: [
    "Insulin resistance",
    "Lasting weight loss",
    "Type 2 Diabetes",
    "94% success rate",
    "Balanced blood sugar",
    "More energy",
    "Confidence",
    "No more diets",
    "Holistic approach",
  ],
} as const;

function isHighlightTopic(topic: string) {
  return topic.includes("94%");
}

function TopicPill({ topic }: { topic: string }) {
  const highlight = isHighlightTopic(topic);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition-shadow duration-300",
        highlight
          ? "border-gold-400/60 bg-gradient-to-r from-white to-gold-400/10 text-slate-800 shadow-gold-400/10"
          : "border-forest-100/80 bg-white/90 text-slate-800 backdrop-blur-sm hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          highlight ? "bg-gold-400/20 text-gold-600" : "bg-forest-50 text-forest-500",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={2.75} aria-hidden />
      </span>
      {topic}
    </span>
  );
}

function MarqueeRow({
  topics,
  direction,
}: {
  topics: readonly string[];
  direction: "left" | "right";
}) {
  return (
    <div className="marquee-fade overflow-hidden py-1.5">
      <ul
        className={cn(
          "marquee-track",
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right",
        )}
      >
        {topics.map((topic) => (
          <li key={topic}>
            <TopicPill topic={topic} />
          </li>
        ))}
        {topics.map((topic) => (
          <li key={`dup-${topic}`} aria-hidden="true">
            <TopicPill topic={topic} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Marquee({ locale }: { locale: Locale }) {
  const topics = locale === "bg" ? TOPICS.bg : TOPICS.en;
  const label = locale === "bg" ? "С фокус върху" : "Focused on";
  const subtitle =
    locale === "bg"
      ? "Реални резултати за жени с инсулинова резистентност и диабет тип 2"
      : "Real results for women with insulin resistance and type 2 diabetes";

  const rowA = topics.slice(0, 5);
  const rowB = topics.slice(5);

  return (
    <section className="relative overflow-hidden border-y border-forest-100 bg-gradient-to-b from-cream via-cream-2/40 to-cream py-10 sm:py-12">
      <div
        className="pointer-events-none absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-forest-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-8 h-44 w-44 rounded-full bg-gold-400/15 blur-3xl"
        aria-hidden
      />

      <Container className="relative">
        <div className="mx-auto max-w-2xl animate-fade-up text-center">
          <p className="eyebrow justify-center">{label}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">{subtitle}</p>
        </div>
      </Container>

      <div className="marquee-scroll relative mt-8 space-y-3 sm:mt-10">
        <MarqueeRow topics={rowA} direction="left" />
        <MarqueeRow topics={rowB} direction="right" />
      </div>

      <ul className="marquee-static mt-8 flex flex-wrap justify-center gap-2 px-4 sm:mt-10 sm:gap-3">
        {topics.map((topic) => (
          <li key={`static-${topic}`}>
            <TopicPill topic={topic} />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex justify-center sm:mt-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 bg-white/80 text-forest-500 shadow-sm">
          <Leaf className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
    </section>
  );
}
