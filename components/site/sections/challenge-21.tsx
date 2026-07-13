import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const COLLAGE_IMAGES = [
  "/images/6.jpg",
  "/images/7.jpg",
  "/images/8.jpg",
  "/images/10.jpg",
] as const;

const SIGNUP_URL = "https://www.subscribepage.com/21_days_24";

function ChallengePromoCard({ challenge21 }: { challenge21: Dictionary["challenge21"] }) {
  return (
    <div className="rounded-3xl border border-white/30 bg-white/95 px-5 py-6 text-center shadow-2xl backdrop-blur-sm sm:px-7 sm:py-7">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-sm font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-base">
        {challenge21.discount}
      </span>
      <p className="mt-4 text-[11px] font-bold uppercase leading-snug text-coral-600 sm:text-xs">
        {challenge21.cardLine1}
      </p>
      <p className="mt-2 font-display text-lg font-bold leading-tight text-slate-800 sm:text-xl">
        {challenge21.cardLine2}
      </p>
      <p className="mt-2 font-display text-base italic text-slate-700 sm:text-lg">
        {challenge21.cardSignature}
      </p>
    </div>
  );
}

export function Challenge21Section({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { challenge21 } = dict;

  return (
    <section
      id="challenge-21"
      className="section-pad scroll-mt-24 bg-slate-800 text-white"
    >
      <Container>
        <header className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {challenge21.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
            {challenge21.subtitle}
          </p>
        </header>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="mx-auto w-full max-w-lg space-y-6">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {COLLAGE_IMAGES.map((src) => (
                <figure
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-xl bg-slate-700/80 ring-1 ring-white/10"
                >
                  <SiteImage
                    src={src}
                    alt={mediaAlt(src, locale)}
                    fill
                    sizes="(max-width: 1024px) 45vw, 250px"
                    imageClassName="object-cover"
                  />
                </figure>
              ))}
            </div>

            <ChallengePromoCard challenge21={challenge21} />
          </div>

          <div>
            <ul className="space-y-3 text-sm leading-relaxed text-slate-200 sm:text-base">
              {challenge21.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <CtaLink
              placementKey="challenge_21_cta"
              href={SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              className="mt-10 rounded-lg bg-white px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-800 shadow-lg hover:bg-cream"
            >
              {challenge21.cta}
            </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
