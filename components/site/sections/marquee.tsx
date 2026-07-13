import { Check } from "lucide-react";
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

export function Marquee({ locale }: { locale: Locale }) {
  const topics = locale === "bg" ? TOPICS.bg : TOPICS.en;
  const label = locale === "bg" ? "С фокус върху" : "Focused on";
  const subtitle =
    locale === "bg"
      ? "Реални резултати при инсулинова резистентност и диабет тип 2"
      : "Real results for insulin resistance and type 2 diabetes";

  return (
    <section className="border-y border-forest-100 bg-cream-2/50 py-10 sm:py-12">
      <Container>
        <div className="mx-auto max-w-xl text-center">
          <p className="eyebrow justify-center">{label}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">{subtitle}</p>
        </div>

        <ul className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-2.5 sm:mt-10 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {topics.map((topic, index) => {
            const highlight = isHighlightTopic(topic);
            return (
              <li
                key={topic}
                className="animate-fade-up flex justify-center"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span
                  className={cn(
                    "inline-flex w-full max-w-[16rem] items-center gap-2 rounded-xl border px-3.5 py-2.5 text-center text-sm font-medium shadow-sm transition-transform duration-300 hover:-translate-y-0.5 sm:max-w-none sm:rounded-full sm:px-4 sm:text-left",
                    highlight
                      ? "border-gold-400/50 bg-white text-slate-800"
                      : "border-forest-100 bg-white text-slate-800",
                  )}
                >
                  <span
                    className={cn(
                      "mx-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:mx-0",
                      highlight ? "bg-gold-400/15 text-gold-600" : "bg-forest-50 text-forest-500",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.75} aria-hidden />
                  </span>
                  <span className="leading-snug">{topic}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
