import { Star } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Testimonials({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { testimonials } = dict;
  return (
    <section id="testimonials" className="section-pad scroll-mt-24 bg-white">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <Star className="h-4 w-4 fill-gold-500 text-gold-500" /> 5.0 Google
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {testimonials.title}
          </h2>
          <p className="mt-4 text-ink-soft">{testimonials.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-xl border border-forest-100 bg-cream p-6"
            >
              <span className="font-serif text-5xl leading-none text-forest-200">&ldquo;</span>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {locale === "bg" ? (
                  <>
                    <span className="mb-2 block text-xs font-medium text-forest-500">
                      Клиент на Веси Ней:
                    </span>
                    {t.quote}
                  </>
                ) : (
                  t.quote
                )}
              </blockquote>
              <figcaption className="mt-6 border-t border-forest-100 pt-4">
                <p className="font-semibold text-slate-800">{t.name}</p>
                <p className="mt-1 text-sm text-ink-soft">
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
