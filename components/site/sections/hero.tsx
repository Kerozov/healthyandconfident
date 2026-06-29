import { Check, Sparkles, TrendingUp } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct, Segment } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function Hero({
  dict,
  locale,
  placements,
  offersById,
  segments,
}: {
  dict: Dictionary;
  locale: Locale;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
  segments: Segment[];
}) {
  const { hero } = dict;
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#F0F9F0] via-[#F7FBF7] to-[#FFFDF5] pt-10 pb-20 lg:pt-16">
      <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-green-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-cream-100/80 blur-3xl" />

      <Container className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-100 px-4 py-1 text-sm font-medium text-green-700">
            <Sparkles className="h-4 w-4" /> {hero.eyebrow}
          </span>

          {locale === "bg" ? (
            <>
              <p className="mt-5 font-sans text-base font-semibold leading-snug tracking-normal text-green-800 sm:text-lg">
                Веси Ней — Холистичен диетолог
              </p>
              <h1 className="mt-3 font-sans text-[2rem] font-bold leading-[1.1] tracking-tight text-forest-900 sm:text-5xl lg:text-[3.5rem]">
                Свали трайно 5-10-15 кг и се почувствай уверена
              </h1>
            </>
          ) : (
            <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-forest-800 sm:text-6xl lg:text-[4.2rem]">
              {hero.title}{" "}
              <span className="relative inline-block text-green-600">
                {hero.titleAccent}
                <svg
                  className="absolute -bottom-2 left-0 w-full text-green-400"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 9C60 3 240 3 298 9"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          )}

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-green-800 opacity-80">
            {hero.subtitle}
          </p>

          <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {hero.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm font-medium text-forest-800">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={`/${locale}#programs`} variant="gold" size="lg">
                {hero.primaryCta}
              </Button>
              <Button href={`/${locale}#lead`} size="lg" variant="secondary">
                {hero.secondaryCta}
              </Button>
            </div>
            <CtaOfferSlot
              placementKey="hero_primary"
              placements={placements}
              offersById={offersById}
              segments={segments}
              locale={locale}
            />
            <CtaOfferSlot
              placementKey="hero_secondary"
              placements={placements}
              offersById={offersById}
              segments={segments}
              locale={locale}
              compact
            />
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-green-100 pt-8">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <dt className="text-4xl font-bold text-green-600">{s.value}</dt>
                <dd className="mt-1 text-sm leading-snug text-green-800">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div
            className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-500 via-green-600 to-green-800 shadow-soft"
            role="img"
            aria-label="Веси Ней — холистичен диетолог, специалист по инсулинова резистентност"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/images/vessie.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-green-900/70 via-green-800/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="font-display text-2xl font-semibold">Vessie Ney</p>
              <p className="mt-1 text-sm leading-relaxed text-green-50">{hero.imageAlt}</p>
            </div>
          </div>

          <div className="animate-float-slow absolute -left-6 top-10 hidden rounded-2xl border border-green-100 bg-white p-4 shadow-soft sm:block">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold text-green-600">94%</p>
                <p className="text-[11px] text-green-800">
                  {locale === "bg" ? "успех" : "success rate"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
