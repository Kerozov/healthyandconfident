import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Method({ dict }: { dict: Dictionary }) {
  const { method } = dict;
  return (
    <section
      id="method"
      className="scroll-mt-24 bg-gradient-to-b from-green-50 to-white py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-green-600">
            {dict.method.title.split(" ").slice(0, 2).join(" ")}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {method.title}
          </h2>
          <p className="mt-4 text-forest-800">{method.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {method.pillars.map((p, i) => (
            <div
              key={p.title}
              className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition-all hover:border-green-300 hover:shadow-md"
            >
              <span className="text-6xl font-bold text-green-200">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-semibold text-green-700">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-forest-800">{p.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
