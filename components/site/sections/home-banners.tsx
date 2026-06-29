import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";

const FOOD_BANNER_BG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop";

export function BioCommunityBanner({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { bioBanner } = dict;

  return (
    <section aria-label={bioBanner.cta}>
      <div
        className="relative bg-cover bg-center bg-no-repeat py-16 sm:py-24"
        style={{ backgroundImage: `url('${FOOD_BANNER_BG}')` }}
      >
        <div className="absolute inset-0 bg-forest-900/60" aria-hidden />
        <Container className="relative">
          <div className="mx-auto max-w-xl rounded-3xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-sm sm:p-10">
            <h2 className="font-display text-3xl font-bold text-forest-700 sm:text-4xl">
              {bioBanner.title}
            </h2>
            <ul className="mt-6 space-y-2.5 text-left text-sm leading-relaxed text-forest-800 sm:text-base">
              {bioBanner.credentials.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm leading-relaxed text-forest-700 sm:text-base">
              {bioBanner.invite}
            </p>
            <CtaLink
              placementKey="programs_2"
              href={bioBanner.href.replace("{locale}", locale)}
              variant="forest"
              size="lg"
              className="mt-8 px-10 py-4 text-sm font-bold uppercase tracking-wide"
            >
              {bioBanner.cta}
            </CtaLink>
          </div>
        </Container>
      </div>
    </section>
  );
}
