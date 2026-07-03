import { Heart, Leaf, Sparkles, UserRound } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";

const FEATURES = {
  bg: [
    {
      icon: Leaf,
      title: "Холистичен подход",
      text: "Тяло, хранене, начин на мислене и начин на живот — не само калории.",
    },
    {
      icon: UserRound,
      title: "Индивидуални планове",
      text: "Меню и стратегия според твоите цели, график и семейство.",
    },
    {
      icon: Sparkles,
      title: "Баланс и енергия",
      text: "Стабилна кръвна захар, повече сила и добро настроение.",
    },
    {
      icon: Heart,
      title: "Подкрепа и мотивация",
      text: "Структура, насоки и реална грижа на всеки етап.",
    },
  ],
  en: [
    {
      icon: Leaf,
      title: "Holistic approach",
      text: "Body, food, mindset and lifestyle — not calories alone.",
    },
    {
      icon: UserRound,
      title: "Individual plans",
      text: "Menus and strategy tailored to your goals and schedule.",
    },
    {
      icon: Sparkles,
      title: "Balance & energy",
      text: "Stable blood sugar, more vitality and a clearer mind.",
    },
    {
      icon: Heart,
      title: "Support & motivation",
      text: "Structure, guidance and genuine care at every step.",
    },
  ],
} as const;

export function TrustFeatures({ locale }: { locale: Locale }) {
  const items = locale === "bg" ? FEATURES.bg : FEATURES.en;

  return (
    <section className="border-y border-forest-100 bg-white py-12 lg:py-14">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center lg:text-left">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-forest-200 bg-cream text-forest-500 lg:mx-0">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-800">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
