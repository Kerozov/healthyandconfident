import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Method({ dict }: { dict: Dictionary }) {
  const { method } = dict;
  return (
    <section id="method" className="scroll-mt-24 bg-forest-700 py-24 text-cream">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-coral-300">
            {dict.method.title.split(" ").slice(0, 2).join(" ")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {method.title}
          </h2>
          <p className="mt-4 text-cream/75">{method.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {method.pillars.map((p, i) => (
            <div
              key={p.title}
              className="rounded-3xl border border-cream/15 bg-cream/5 p-8 backdrop-blur-sm"
            >
              <span className="font-display text-5xl font-semibold text-coral-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/75">{p.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
