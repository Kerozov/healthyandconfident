import { Quote, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Testimonials({ dict }: { dict: Dictionary }) {
  const { testimonials } = dict;
  return (
    <section id="results" className="scroll-mt-24 bg-cream-2 py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-coral-500">
            <Star className="h-4 w-4 fill-coral-400 text-coral-400" /> 5.0
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {testimonials.title}
          </h2>
          <p className="mt-4 text-ink-soft">{testimonials.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-3xl border border-ink/10 bg-white p-8 shadow-sm"
            >
              <Quote className="h-8 w-8 text-coral-400" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 border-t border-ink/10 pt-4">
                <p className="font-display text-lg font-semibold">{t.name}</p>
                <p className="text-xs text-ink-soft/70">
                  {[t.age, t.location].filter(Boolean).join(" · ")}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
