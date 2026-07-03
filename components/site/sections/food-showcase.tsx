import { UtensilsCrossed } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory } from "@/lib/site/media-gallery";
import { cn } from "@/lib/utils";

const GRID_FOOD = ["/images/6.jpg", "/images/7.jpg", "/images/8.jpg", "/images/10.jpg", "/images/12.jpg", "/images/9.jpg"];

export function FoodShowcase({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { foodGallery } = dict;
  const foodItems = mediaByCategory("food");
  const altFor = (src: string) =>
    foodItems.find((f) => f.src === src)?.alt[locale] ?? foodGallery.featuredAlt;

  return (
    <section id="food" className="scroll-mt-24 bg-cream py-20 lg:py-28">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow text-forest-500">
            <UtensilsCrossed className="mr-1 inline h-4 w-4" />
            {foodGallery.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl lg:text-[2.75rem]">
            {foodGallery.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{foodGallery.subtitle}</p>
        </div>

        <div className="relative mt-12 overflow-hidden rounded-3xl shadow-soft">
          <SiteImage
            src="/images/11.jpg"
            alt={altFor("/images/11.jpg")}
            fill
            priority
            sizes="(max-width: 1200px) 100vw, 1152px"
            className="aspect-[16/10] sm:aspect-[21/9]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
            <p className="max-w-xl font-display text-2xl font-semibold text-white sm:text-3xl">
              {foodGallery.featuredCaption}
            </p>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-100 sm:text-base">
              {foodGallery.featuredNote}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {GRID_FOOD.map((src, i) => (
            <figure
              key={src}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-forest-100/80",
                i === 0 && "md:col-span-2 md:row-span-2",
              )}
            >
              <SiteImage
                src={src}
                alt={altFor(src)}
                fill
                sizes={
                  i === 0
                    ? "(max-width: 768px) 50vw, 33vw"
                    : "(max-width: 768px) 50vw, 16vw"
                }
                className={cn(
                  "aspect-square transition duration-500 group-hover:scale-[1.03]",
                  i === 0 && "md:aspect-auto md:min-h-[320px]",
                )}
              />
            </figure>
          ))}
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {foodGallery.highlights.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 rounded-xl border border-forest-100 bg-white px-4 py-3 text-sm text-forest-800"
            >
              <span className="mt-0.5 text-forest-500">✓</span>
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button href={`/${locale}#programs`} variant="primary" size="lg">
            {foodGallery.cta}
          </Button>
          <Button href={`/${locale}#results`} variant="secondary" size="lg">
            {foodGallery.ctaSecondary}
          </Button>
        </div>
      </Container>
    </section>
  );
}
