import { Check } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";

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

export function Marquee({ locale }: { locale: Locale }) {
  const topics = locale === "bg" ? TOPICS.bg : TOPICS.en;
  const label = locale === "bg" ? "С фокус върху" : "Focused on";

  return (
    <section className="border-y border-forest-100 bg-cream py-8">
      <Container>
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-forest-500">
          {label}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {topics.map((topic) => (
            <li
              key={topic}
              className="inline-flex items-center gap-1.5 rounded-full border border-forest-100 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-forest-500" aria-hidden />
              {topic}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
