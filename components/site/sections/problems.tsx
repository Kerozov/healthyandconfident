import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/site/icon";

export function Problems({ dict }: { dict: Dictionary }) {
  const { problems } = dict;
  return (
    <section id="problems" className="section-pad scroll-mt-24 bg-white">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {problems.title}
          </h2>
          <p className="mt-4 text-ink-soft">{problems.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.items.map((p) => (
            <div
              key={p.text}
              className="rounded-xl border border-forest-100 bg-cream p-5 transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-forest-500/10 text-forest-500">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-medium leading-snug text-slate-800">{p.text}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl rounded-xl border border-forest-100 bg-cream px-6 py-5 text-center text-sm text-ink-soft">
          {problems.note}
        </p>
      </Container>
    </section>
  );
}
