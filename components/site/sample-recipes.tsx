import type { Locale } from "@/i18n/config";
import type { SampleRecipe } from "@/lib/programs/sample-recipes";
import { SiteImage } from "@/components/site/site-image";
import { cn } from "@/lib/utils";

export function SampleRecipes({
  recipes,
  locale,
  heading: Heading = "h2",
  className,
}: {
  recipes: readonly SampleRecipe[];
  locale: Locale;
  heading?: "h2" | "h4";
  className?: string;
}) {
  return (
    <section id="sample-recipes" className={cn("scroll-mt-24", className)}>
      <Heading className="text-center font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
        {locale === "bg" ? "Примерни рецепти" : "Sample recipes in Bulgarian"}
      </Heading>
      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
        {recipes.map(({ src, alt, width, height }) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noopener"
            className="group block overflow-hidden rounded-2xl bg-white text-center shadow-md ring-1 ring-forest-100"
          >
            <SiteImage src={src} alt={alt[locale]} width={width} height={height} />
            <span className="block px-4 py-3 text-sm font-semibold text-forest-700 group-hover:underline group-focus-visible:underline">
              {locale === "bg" ? "Отвори в пълен размер" : "Open full size"}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
