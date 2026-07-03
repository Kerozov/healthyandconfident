import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function SuccessProof({ dict }: { dict: Dictionary }) {
  const { hero } = dict;

  return (
    <section className="border-y border-forest-100 bg-white py-10">
      <Container>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {hero.stats.map((s) => (
            <div key={s.label} className="text-center">
              <p
                className={
                  s.value === "94%"
                    ? "font-display text-5xl font-semibold text-forest-500 sm:text-6xl"
                    : "font-display text-4xl font-semibold text-slate-800 sm:text-5xl"
                }
              >
                {s.value}
              </p>
              <p className="mx-auto mt-2 max-w-[12rem] text-sm leading-snug text-ink-soft">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
