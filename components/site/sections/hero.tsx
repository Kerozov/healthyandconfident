import { ArrowRight, Award, Check } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { OpenMenuButton } from "@/components/site/open-menu-button";
import { SectionLink } from "@/components/site/section-link";
import { SiteImage } from "@/components/site/site-image";
import { StarRow } from "@/components/site/star-row";
import { cn } from "@/lib/utils";

/** The professional portrait — the first face a cold visitor meets. */
const HERO_IMAGE = "/images/3.jpg";

/**
 * Above the fold: who it is for, the outcome, three reasons it is easy, one
 * clear next step — and a free menu for anyone not ready to buy yet.
 */
export function Hero({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { hero } = dict;

  return (
    <section className="relative overflow-hidden bg-cream pb-12 pt-6 sm:pb-16 sm:pt-10 lg:pb-20 lg:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-forest-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl"
      />

      <Container className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="max-w-xl animate-fade-up">
          {/* On a phone the portrait sits below the buttons, so a face greets the visitor here. */}
          <div className="flex items-center gap-3 lg:hidden">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
              <SiteImage
                src={HERO_IMAGE}
                alt=""
                fill
                priority
                sizes="44px"
                imageClassName="object-cover object-[center_15%]"
              />
            </span>
            <p className="eyebrow">{hero.eyebrow}</p>
          </div>
          {/* `.eyebrow` sets its own display, so the breakpoint toggle lives on a wrapper. */}
          <div className="hidden lg:block">
            <p className="eyebrow">{hero.eyebrow}</p>
          </div>

          <h1 className="mt-4 font-display text-[2.05rem] font-semibold leading-[1.1] tracking-tight text-slate-800 sm:text-5xl lg:text-[3.4rem] text-balance">
            {hero.title}
            <span className="whitespace-nowrap text-forest-500">{hero.titleAccent}</span>
            {hero.titleAfter}
          </h1>

          <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
            {hero.subtitle}
          </p>

          <ul className="mt-6 space-y-2.5">
            {hero.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 text-[15px] font-medium text-slate-800">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-500 text-white">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SectionLink
              href="#programs"
              locale={locale}
              className={cn(
                buttonVariants({ variant: "primary", size: "lg" }),
                "h-14 w-full rounded-full px-8 text-base shadow-lg shadow-slate-800/15 sm:w-auto",
              )}
            >
              {hero.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </SectionLink>
            <OpenMenuButton
              source="hero"
              variant="outline"
              size="lg"
              className="h-14 w-full rounded-full sm:w-auto"
            >
              {hero.freeMenuCta}
            </OpenMenuButton>
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-soft">
            <StarRow rating={5} />
            <span className="font-semibold text-slate-800">{hero.ratingLabel}</span>
            <span aria-hidden className="text-forest-300">·</span>
            <span>{hero.trustLine}</span>
          </p>
        </div>

        <figure className="relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-cream-2 shadow-soft ring-1 ring-forest-100">
            <SiteImage
              src={HERO_IMAGE}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 28rem, 34rem"
              imageClassName="object-cover object-[center_20%]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent px-5 pb-5 pt-24 sm:px-6 sm:pb-6">
              <div className="flex items-end gap-3">
                <p className="font-display text-5xl font-semibold leading-none tabular-nums text-white">
                  {hero.successValue.replace("%", "")}
                  <span className="text-gold-400">%</span>
                </p>
                <p className="mb-1 max-w-[10rem] text-xs font-medium leading-snug text-slate-100">
                  {hero.successLabel}
                </p>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-gold-500 to-gold-400" />
              </div>
            </figcaption>
          </div>

          <div className="absolute -top-3 left-3 flex max-w-[15rem] items-center gap-2.5 rounded-2xl bg-white/95 px-3.5 py-2.5 shadow-lg ring-1 ring-forest-100 backdrop-blur sm:-left-5 sm:top-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400/25 text-gold-600">
              <Award className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-[11px] font-semibold leading-snug text-slate-800">{hero.award}</p>
          </div>
        </figure>
      </Container>
    </section>
  );
}
