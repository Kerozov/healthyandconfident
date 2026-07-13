import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory, mediaIntrinsicSize } from "@/lib/site/media-gallery";

const FOOD_ITEMS = mediaByCategory("food");
const FEATURED = "/images/11.jpg";

export function FoodShowcase({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { foodGallery } = dict;
  const altFor = (src: string) =>
    FOOD_ITEMS.find((f) => f.src === src)?.alt[locale] ?? foodGallery.featuredAlt;

  const gridItems = FOOD_ITEMS.filter((f) => f.src !== FEATURED);
  const featuredSize = mediaIntrinsicSize(FEATURED);

  return (
    <section id="food" className="section-pad scroll-mt-24 bg-white">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{foodGallery.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {foodGallery.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            {foodGallery.subtitle}
          </p>
        </div>

        <figure className="mt-12 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-forest-100">
          <SiteImage
            src={FEATURED}
            alt={altFor(FEATURED)}
            width={featuredSize.width}
            height={featuredSize.height}
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="h-auto w-full"
          />
          <figcaption className="border-t border-forest-100 bg-cream px-6 py-5 sm:px-8">
            <p className="font-display text-lg font-semibold text-slate-800">
              {foodGallery.featuredCaption}
            </p>
            <p className="mt-1 text-sm text-ink-soft">{foodGallery.featuredNote}</p>
          </figcaption>
        </figure>

        <div className="mt-6 grid grid-cols-2 items-start gap-3 sm:gap-4 lg:grid-cols-4">
          {gridItems.slice(0, 4).map((item) => {
            const size = mediaIntrinsicSize(item.src);
            return (
              <figure
                key={item.src}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-forest-100"
              >
                <SiteImage
                  src={item.src}
                  alt={altFor(item.src)}
                  width={size.width}
                  height={size.height}
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="h-auto w-full"
                />
              </figure>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-3 items-start gap-3 sm:gap-4">
          {gridItems.slice(4).map((item) => {
            const size = mediaIntrinsicSize(item.src);
            return (
              <figure
                key={item.src}
                className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-forest-100"
              >
                <SiteImage
                  src={item.src}
                  alt={altFor(item.src)}
                  width={size.width}
                  height={size.height}
                  sizes="(max-width: 768px) 33vw, 20vw"
                  className="h-auto w-full"
                />
              </figure>
            );
          })}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {foodGallery.highlights.map((line) => (
            <div
              key={line}
              className="rounded-xl border border-forest-100 bg-cream px-4 py-3.5 text-sm text-slate-800"
            >
              <span className="mr-2 text-forest-500">✓</span>
              {line}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-2.5 sm:mt-10 sm:flex-row sm:gap-3">
          <Button href={`/${locale}#programs`} variant="primary" size="lg" className="w-full sm:w-auto">
            {foodGallery.cta}
          </Button>
          <Button href={`/${locale}#results`} variant="outline" size="lg" className="w-full sm:w-auto">
            {foodGallery.ctaSecondary}
          </Button>
        </div>
      </Container>
    </section>
  );
}
