import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

/** Real dishes from the programme menus — the answer to „will I be hungry?“. */
const FOOD = [
  "/images/6.jpg",
  "/images/7.jpg",
  "/images/10.jpg",
  "/images/8.jpg",
  "/images/12.jpg",
  "/images/9.jpg",
] as const;

export function Method({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { method } = dict;

  return (
    <section id="method" className="section-pad scroll-mt-24 bg-cream">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{method.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl text-balance">
            {method.title}
          </h2>
          <p className="mt-4 text-ink-soft">{method.subtitle}</p>
          <p className="mt-5 font-display text-xl font-semibold text-forest-600 sm:text-2xl text-balance">
            {method.highlight}
          </p>
        </div>

        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {method.pillars.map((pillar, i) => (
            <li
              key={pillar.title}
              className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-forest-100 sm:p-7"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-500 font-display text-lg font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-slate-800">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pillar.text}</p>
            </li>
          ))}
        </ol>

        <div id="food" className="mt-16 scroll-mt-24">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-semibold text-slate-800 sm:text-3xl">
                {method.foodTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{method.foodNote}</p>
            </div>
            <ul className="flex flex-wrap gap-2 md:max-w-md md:justify-end">
              {method.highlights.map((line) => (
                <li
                  key={line}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 ring-1 ring-forest-100"
                >
                  <Check className="h-3.5 w-3.5 text-forest-500" strokeWidth={2.5} aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
            {FOOD.map((src) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-2xl bg-cream-2">
                <SiteImage
                  src={src}
                  alt={mediaAlt(src, locale)}
                  fill
                  sizes="(max-width: 1024px) 33vw, 180px"
                  imageClassName="object-cover transition duration-500 hover:scale-[1.04]"
                />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
