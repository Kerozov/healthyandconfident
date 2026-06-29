import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";

const COLLAGE_IMAGES = [
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=500&fit=crop",
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&h=500&fit=crop",
] as const;

const SIGNUP_URL = "https://www.subscribepage.com/21_days_24";

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
      className="scroll-mt-24 bg-forest-900 py-20 text-white sm:py-24"
    >
      <Container>
        <header className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {challenge21.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-green-100/90 sm:text-lg">
            {challenge21.subtitle}
          </p>
        </header>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative mx-auto w-full max-w-lg">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {COLLAGE_IMAGES.map((src) => (
                <div
                  key={src}
                  className="aspect-square overflow-hidden rounded-lg bg-forest-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
              <div className="relative max-w-[85%] rounded-3xl border border-white/30 bg-white/95 px-5 py-5 text-center shadow-2xl backdrop-blur-sm sm:px-7 sm:py-6">
                <span className="absolute -left-3 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-coral-500 text-sm font-bold text-white shadow-lg sm:-left-5 sm:h-16 sm:w-16 sm:text-base">
                  {challenge21.discount}
                </span>
                <p className="text-[11px] font-bold uppercase leading-snug text-coral-600 sm:text-xs">
                  {challenge21.cardLine1}
                </p>
                <p className="mt-2 font-display text-lg font-bold uppercase leading-tight text-forest-900 sm:text-xl">
                  {challenge21.cardLine2}
                </p>
                <p className="mt-2 font-display text-base italic text-forest-800 sm:text-lg">
                  {challenge21.cardSignature}
                </p>
              </div>
            </div>
          </div>

          <div>
            <ul className="space-y-3 text-sm leading-relaxed text-green-50 sm:text-base">
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
              className="mt-10 rounded-sm bg-white px-8 py-4 text-sm font-bold uppercase tracking-wide text-forest-900 shadow-lg hover:bg-cream-50"
            >
              {challenge21.cta}
            </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
