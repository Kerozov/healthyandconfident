import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const METHOD_FOOD = "/images/6.jpg";

export function Method({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { method } = dict;
  return (
    <section id="method" className="section-pad scroll-mt-24 bg-white">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">
            {locale === "bg" ? "Методът" : "The method"}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {method.title}
          </h2>
          <p className="mt-4 text-base text-ink-soft">{method.subtitle}</p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-forest-100 lg:sticky lg:top-28">
            <SiteImage
              src={METHOD_FOOD}
              alt={mediaAlt(METHOD_FOOD, locale)}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="space-y-4">
            {method.pillars.map((p, i) => (
              <div
                key={p.title}
                className="rounded-xl border border-forest-100 bg-cream p-6"
              >
                <span className="text-sm font-semibold text-forest-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold text-slate-800">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
