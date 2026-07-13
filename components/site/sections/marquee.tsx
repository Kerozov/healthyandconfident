import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const COPY = {
  bg: {
    label: "С фокус върху",
    subtitle:
      "Реални резултати при инсулинова резистентност и диабет тип 2",
    statValue: "94%",
    statLabel: "доказан успех при клиентите",
    topics: [
      "Инсулинова резистентност",
      "Трайно отслабване",
      "Диабет тип 2",
      "Балансирана кръвна захар",
      "Повече енергия",
      "Увереност",
      "Без диети",
      "Холистичен подход",
    ],
  },
  en: {
    label: "Focused on",
    subtitle: "Real results for insulin resistance and type 2 diabetes",
    statValue: "94%",
    statLabel: "proven client success",
    topics: [
      "Insulin resistance",
      "Lasting weight loss",
      "Type 2 diabetes",
      "Balanced blood sugar",
      "More energy",
      "Confidence",
      "No more diets",
      "Holistic approach",
    ],
  },
} as const;

export function Marquee({ locale }: { locale: Locale }) {
  const copy = locale === "bg" ? COPY.bg : COPY.en;

  return (
    <section className="relative overflow-hidden border-y border-forest-100/80 bg-cream py-12 sm:py-16">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-forest-400/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-gold-400/15 blur-3xl"
        aria-hidden
      />

      <Container className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow justify-center">{copy.label}</p>
          <p className="mt-3 font-display text-xl font-semibold leading-snug text-slate-800 sm:text-2xl">
            {copy.subtitle}
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-5xl sm:mt-10">
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:items-stretch">
            {/* Featured stat */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-800 p-6 shadow-lg sm:p-8 lg:flex lg:flex-col lg:justify-between">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-forest-400/15 blur-2xl"
                aria-hidden
              />

              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300/90">
                  {locale === "bg" ? "Метод с доказани резултати" : "Proven method"}
                </p>
                <p className="mt-4 font-display text-6xl font-semibold tabular-nums leading-none text-white sm:text-7xl">
                  {copy.statValue.replace("%", "")}
                  <span className="text-gold-300">%</span>
                </p>
                <p className="mt-3 max-w-[14rem] text-sm font-medium leading-snug text-slate-300">
                  {copy.statLabel}
                </p>
              </div>

              <div className="relative mt-8">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-gold-500 to-gold-300 shadow-[0_0_14px_rgba(212,168,67,0.5)]" />
                </div>
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {locale === "bg" ? "успеваемост при клиентите" : "client success rate"}
                </p>
              </div>
            </div>

            {/* Topic grid */}
            <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {copy.topics.map((topic, index) => (
                <li
                  key={topic}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={cn(
                      "group flex h-full min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3.5 py-3 transition duration-300 sm:min-h-[5rem] sm:px-4 sm:py-3.5",
                      "border-forest-100/90 bg-white/90 shadow-sm backdrop-blur-sm",
                      "hover:-translate-y-0.5 hover:border-forest-200 hover:shadow-md",
                    )}
                  >
                    <span
                      className="mb-2 h-0.5 w-6 rounded-full bg-gradient-to-r from-forest-500 to-gold-400 transition-all duration-300 group-hover:w-10"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold leading-snug text-slate-800">
                      {topic}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
