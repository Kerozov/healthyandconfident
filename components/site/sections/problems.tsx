import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/site/icon";

export function Problems({ dict }: { dict: Dictionary }) {
  const { problems } = dict;
  return (
    <section className="py-20">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {problems.title}
          </h2>
          <p className="mt-4 text-ink-soft">{problems.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {problems.items.map((p) => (
            <div
              key={p.text}
              className="group rounded-2xl border border-ink/10 bg-bg-card p-6 transition-all hover:-translate-y-1 hover:border-coral-400 hover:shadow-soft"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-50 text-forest-600 transition-colors group-hover:bg-coral-500 group-hover:text-white">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-medium leading-snug">{p.text}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl rounded-2xl bg-cream-2 px-6 py-5 text-center text-sm text-ink-soft">
          {problems.note}
        </p>
      </Container>
    </section>
  );
}
