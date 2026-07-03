import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const METHOD_FOOD = "/images/6.jpg";

export function Method({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { method } = dict;
  return (
    <section
      id="method"
      className="scroll-mt-24 bg-gradient-to-b from-cream-2 to-white py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-forest-500">Method</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {method.title}
          </h2>
          <p className="mt-4 text-ink-soft">{method.subtitle}</p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative overflow-hidden rounded-3xl shadow-soft ring-1 ring-forest-100">
            <SiteImage
              src={METHOD_FOOD}
              alt={mediaAlt(METHOD_FOOD, locale)}
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="aspect-[4/5] lg:aspect-[3/4]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
            <p className="absolute bottom-5 left-5 right-5 text-sm font-medium text-white">
              {dict.foodGallery.featuredNote}
            </p>
          </div>

          <div className="grid gap-6">
            {method.pillars.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl border border-forest-100 bg-white p-6 shadow-sm transition-all hover:border-forest-300 hover:shadow-md"
              >
                <span className="text-5xl font-bold text-forest-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-semibold text-forest-800">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
