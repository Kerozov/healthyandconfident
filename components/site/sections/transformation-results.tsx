import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory } from "@/lib/site/media-gallery";

const CLIENT_RESULTS = [
  "/images/14.jpg",
  "/images/15.jpg",
  "/images/16.jpg",
  "/images/17.jpg",
];

export function TransformationResults({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { results } = dict;
  const resultMedia = mediaByCategory("result");
  const altFor = (src: string) =>
    resultMedia.find((r) => r.src === src)?.alt[locale] ?? "";

  return (
    <section id="results" className="section-pad scroll-mt-24 bg-cream-2">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{results.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {results.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">{results.subtitle}</p>
        </div>

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-forest-100">
            <SiteImage
              src="/images/13.jpg"
              alt={altFor("/images/13.jpg")}
              width={800}
              height={900}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full"
            />
            <figcaption className="border-t border-forest-100 px-5 py-4 text-center text-sm text-slate-800">
              {results.beforeAfterCaption}
            </figcaption>
          </figure>

          <div className="flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-forest-100 sm:p-8">
            <div className="grid grid-cols-3 gap-2 border-b border-forest-100 pb-6 sm:gap-4 sm:pb-8">
              {results.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-display text-2xl font-semibold text-forest-500 sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-ink-soft sm:text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            <ul className="mt-8 flex-1 space-y-3">
              {results.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-slate-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" strokeWidth={2.5} />
                  {b}
                </li>
              ))}
            </ul>

            <Button href={`/${locale}#contact`} variant="primary" size="lg" className="mt-8 w-full sm:w-auto">
              {results.cta}
            </Button>
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-center font-display text-xl font-semibold text-slate-800">
            {results.clientsTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-ink-soft">
            {results.clientsSubtitle}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {CLIENT_RESULTS.map((src, i) => (
              <figure
                key={src}
                className="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-forest-100"
              >
                <div className="relative aspect-[3/4]">
                  <SiteImage
                    src={src}
                    alt={altFor(src)}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                {results.clientCaptions[i] && (
                  <figcaption className="px-3 py-2.5 text-center text-[11px] leading-snug text-ink-soft">
                    {results.clientCaptions[i]}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
