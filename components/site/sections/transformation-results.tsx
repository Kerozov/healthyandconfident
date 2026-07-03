import { Award, TrendingUp } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory } from "@/lib/site/media-gallery";

const CLIENT_RESULTS = ["/images/15.jpg", "/images/16.jpg", "/images/14.jpg"];

export function TransformationResults({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { results } = dict;
  const awards = mediaByCategory("award");
  const resultMedia = mediaByCategory("result");
  const altFor = (src: string) =>
    resultMedia.find((r) => r.src === src)?.alt[locale] ??
    awards.find((a) => a.src === src)?.alt[locale] ??
    "";

  return (
    <section id="results" className="scroll-mt-24 bg-white py-20 lg:py-28">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-slate-500">{results.eyebrow}</span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {results.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{results.subtitle}</p>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <figure className="overflow-hidden rounded-3xl shadow-soft ring-1 ring-forest-100">
            <SiteImage
              src="/images/13.jpg"
              alt={altFor("/images/13.jpg")}
              width={800}
              height={1000}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="rounded-3xl"
            />
            <figcaption className="bg-cream-2 px-5 py-4 text-center text-sm font-medium text-forest-800">
              {results.beforeAfterCaption}
            </figcaption>
          </figure>

          <div>
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-forest-100 bg-cream p-6">
              {results.stats.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-display text-3xl font-bold text-slate-500 sm:text-4xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-ink-soft sm:text-sm">{s.label}</p>
                </div>
              ))}
            </div>

            <ul className="mt-8 space-y-4">
              {results.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-forest-800">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-500 text-xs text-white">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>

            <Button href={`/${locale}#contact`} variant="primary" size="lg" className="mt-8">
              {results.cta}
            </Button>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-gold-500" />
            <h3 className="font-display text-xl font-semibold text-forest-800">
              {results.awardsTitle}
            </h3>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {awards.map((item) => (
              <figure
                key={item.src}
                className="overflow-hidden rounded-2xl border border-forest-100 bg-cream shadow-sm"
              >
                <SiteImage
                  src={item.src}
                  alt={item.alt[locale]}
                  width={800}
                  height={500}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="rounded-t-2xl"
                />
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-16">
          <h3 className="text-center font-display text-2xl font-semibold text-forest-800">
            {results.clientsTitle}
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-center text-ink-soft">
            {results.clientsSubtitle}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {CLIENT_RESULTS.map((src, i) => (
              <figure
                key={src}
                className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-forest-100"
              >
                <div className="relative aspect-[3/4]">
                  <SiteImage
                    src={src}
                    alt={altFor(src)}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
                {results.clientCaptions[i] && (
                  <figcaption className="bg-white px-4 py-3 text-center text-xs text-ink-soft">
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
