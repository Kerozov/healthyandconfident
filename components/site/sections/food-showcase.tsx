import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory } from "@/lib/site/media-gallery";

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

        <figure className="relative mt-10 overflow-hidden rounded-3xl bg-cream shadow-card ring-1 ring-forest-100 sm:mt-12">
          <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
            <SiteImage
              src={FEATURED}
              alt={altFor(FEATURED)}
              fill
              sizes="(max-width: 1200px) 100vw, 1152px"
              imageClassName="object-cover"
              priority={false}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-6">
              <figcaption>
                <p className="font-display text-lg font-semibold text-white sm:text-xl">
                  {foodGallery.featuredCaption}
                </p>
                <p className="mt-1 text-sm text-slate-200">{foodGallery.featuredNote}</p>
              </figcaption>
            </div>
          </div>
        </figure>

        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3">
          {gridItems.map((item) => (
            <li key={item.src}>
              <figure className="relative aspect-square overflow-hidden rounded-2xl bg-cream ring-1 ring-forest-100/80">
                <SiteImage
                  src={item.src}
                  alt={altFor(item.src)}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
                  imageClassName="object-cover transition duration-500 hover:scale-[1.04]"
                />
              </figure>
            </li>
          ))}
        </ul>

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

        <div className="mt-10 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
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
