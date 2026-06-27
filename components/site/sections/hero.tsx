import { Check, Sparkles, TrendingUp } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteCtaPlacement, SiteProduct } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CtaOfferSlot } from "@/components/site/cta-offer-slot";

export function Hero({
  dict,
  locale,
  placements,
  offersById,
}: {
  dict: Dictionary;
  locale: Locale;
  placements: Record<string, SiteCtaPlacement>;
  offersById: Record<string, SiteProduct>;
}) {
  const { hero } = dict;
  return (
    <section className="relative overflow-hidden pt-10 pb-20 lg:pt-16">
      {/* background flourishes */}
      <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-coral-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-forest-200/40 blur-3xl" />

      <Container className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <span className="eyebrow rounded-full bg-forest-600/10 px-4 py-2 text-forest-700">
            <Sparkles className="h-4 w-4" /> {hero.eyebrow}
          </span>

          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.2rem]">
            {hero.title}{" "}
            <span className="relative inline-block text-coral-500">
              {hero.titleAccent}
              <svg
                className="absolute -bottom-2 left-0 w-full text-coral-400"
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

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {hero.subtitle}
          </p>

          <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {hero.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm font-medium">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-500 text-cream">
                  <Check className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href={`/${locale}#programs`} size="lg">
                {hero.primaryCta}
              </Button>
              <Button href={`/${locale}#lead`} size="lg" variant="outline">
                {hero.secondaryCta}
              </Button>
            </div>
            <CtaOfferSlot
              placementKey="hero_primary"
              placements={placements}
              offersById={offersById}
              locale={locale}
            />
            <CtaOfferSlot
              placementKey="hero_secondary"
              placements={placements}
              offersById={offersById}
              locale={locale}
              compact
            />
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-ink/10 pt-8">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-semibold text-forest-600">
                  {s.value}
                </dt>
                <dd className="mt-1 text-xs leading-snug text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Visual */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-forest-500 via-forest-600 to-forest-700 shadow-soft">
            {/* Replace with a real portrait at /public/images/vessie.jpg */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-90"
              style={{ backgroundImage: "url('/images/vessie.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-800/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-cream">
              <p className="font-display text-2xl font-semibold">Vessie Ney</p>
              <p className="text-sm text-cream/80">{hero.imageAlt}</p>
            </div>
          </div>

          <div className="animate-float-slow absolute -left-6 top-10 hidden rounded-2xl bg-cream p-4 shadow-soft sm:block">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-300/40 text-coral-600">
                <TrendingUp className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl font-semibold text-ink">94%</p>
                <p className="text-[11px] text-ink-soft">
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
