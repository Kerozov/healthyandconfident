import { Star } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { Container } from "@/components/ui/container";

export function Testimonials({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { testimonials } = dict;
  return (
    <section id="results" className="scroll-mt-24 bg-white py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-peach-400">
            <Star className="h-4 w-4 fill-peach-400 text-peach-400" /> 5.0
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-warm-900 sm:text-4xl">
            {testimonials.title}
          </h2>
          <p className="mt-4 text-warm-800">{testimonials.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.items.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-[#F0D5CC] bg-warm-50 p-6"
            >
              <span className="font-serif text-5xl leading-none text-rose-300">&ldquo;</span>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-warm-800">
                {locale === "bg" ? (
                  <>
                    <span className="mb-2 block text-xs font-medium text-[#8B6A5A]">
                      Клиент на Веси Ней:
                    </span>
                    {t.quote}
                  </>
                ) : (
                  t.quote
                )}
              </blockquote>
              <figcaption className="mt-6 border-t border-[#F0D5CC] pt-4">
                <p className="font-medium text-warm-900">{t.name}</p>
                <p className="mt-1 text-sm text-warm-700">
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
