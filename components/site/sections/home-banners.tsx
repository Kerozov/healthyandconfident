import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt, mediaByCategory } from "@/lib/site/media-gallery";

const BANNER_IMAGE = "/images/11.jpg";
const FOOD_COLLAGE = mediaByCategory("food").filter((f) => f.src !== BANNER_IMAGE).slice(0, 4);

export function BioCommunityBanner({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { bioBanner } = dict;

  return (
    <section aria-label={bioBanner.cta} className="relative min-h-[480px] overflow-hidden">
      <div className="absolute inset-0">
        <SiteImage
          src={BANNER_IMAGE}
          alt={mediaAlt(BANNER_IMAGE, locale)}
          fill
          sizes="100vw"
          imageClassName="object-cover"
        />
        <div className="absolute inset-0 bg-slate-800/65" aria-hidden />
      </div>
      <Container className="relative section-pad">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            {FOOD_COLLAGE.map((item) => (
              <div
                key={item.src}
                className="relative aspect-square overflow-hidden rounded-xl ring-2 ring-white/30"
              >
                <SiteImage
                  src={item.src}
                  alt={item.alt[locale]}
                  fill
                  sizes="200px"
                />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-sm sm:p-10 lg:text-left">
          <p className="font-display text-4xl font-semibold text-forest-500">94%</p>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            {locale === "bg" ? "успех при клиентите" : "client success rate"}
          </p>
          <h2 className="mt-6 font-display text-2xl font-semibold text-slate-800 sm:text-3xl">
            {bioBanner.title}
          </h2>
          <ul className="mt-6 space-y-2.5 text-left text-sm leading-relaxed text-slate-700 sm:text-base">
            {bioBanner.credentials.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-ink-soft sm:text-base">
            {bioBanner.invite}
          </p>
          <CtaLink
            placementKey="programs_2"
            href={bioBanner.href.replace("{locale}", locale)}
            variant="forest"
            size="lg"
            className="mt-8 rounded-lg px-10"
          >
            {bioBanner.cta}
          </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
