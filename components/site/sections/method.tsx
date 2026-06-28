import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Method({ dict }: { dict: Dictionary }) {
  const { method } = dict;
  return (
    <section
      id="method"
      className="scroll-mt-24 bg-gradient-to-b from-sage-50 to-white py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-sage-600">
            {dict.method.title.split(" ").slice(0, 2).join(" ")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            {method.title}
          </h2>
          <p className="mt-4 text-warm-800">{method.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {method.pillars.map((p, i) => (
            <div
              key={p.title}
              className="rounded-2xl border border-sage-100 bg-white p-6 shadow-sm"
            >
              <span className="text-5xl font-bold text-rose-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-semibold text-sage-600">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-warm-800">{p.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
