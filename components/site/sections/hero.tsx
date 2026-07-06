import { Check, Gift } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { LeadForm } from "@/components/site/lead-form";
import { mediaAlt } from "@/lib/site/media-gallery";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/images/5.jpg";

export function Hero({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { hero, leadMagnet } = dict;

  const headline =
    locale === "bg" ? (
      <>
        Свали трайно <span className="text-forest-500">5–15 кг</span> и се почувствай уверена
      </>
    ) : (
      <>
        {hero.title} <span className="text-forest-500">{hero.titleAccent}</span>
      </>
    );

  return (
    <section className="section-pad bg-cream pt-6 sm:pt-10">
      <Container className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
        <div className="order-1 max-w-xl animate-fade-up lg:order-1">
          <p className="eyebrow">{hero.eyebrow}</p>

          <h1 className="mt-3 font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-slate-800 sm:mt-4 sm:text-4xl sm:leading-[1.12] lg:text-[3.25rem]">
            {headline}
          </h1>

          <div
            id="free-menu"
            className="mt-5 scroll-mt-24 rounded-2xl border border-forest-200 bg-white p-4 shadow-sm ring-1 ring-forest-100/80 sm:mt-6 sm:p-5"
          >
            <div className="mb-3 flex items-start gap-3 sm:mb-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-500/15 text-forest-600 sm:h-10 sm:w-10">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-slate-800 sm:text-lg">
                  {hero.freeMenuStrip.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft sm:text-sm">
                  {hero.freeMenuStrip.subtitle}
                </p>
              </div>
            </div>
            <LeadForm
              locale={locale}
              button={leadMagnet.button}
              consent={leadMagnet.consent}
              success={leadMagnet.success}
              error={leadMagnet.error}
              segmentTag="weight-loss"
              source="hero-free-menu"
              compact
              offerPlacementKey="leadmagnet_cta"
            />
          </div>

          <p className="mt-5 text-base leading-relaxed text-ink-soft sm:mt-6 sm:text-lg">
            {hero.subtitle}
          </p>

          <ul className="mt-5 space-y-2 sm:mt-6 sm:space-y-2.5">
            {hero.bullets.slice(0, 4).map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-800">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" strokeWidth={2.5} />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Button
              href={`/${locale}#free-menu`}
              variant="forest"
              size="lg"
              className="w-full sm:w-auto"
            >
              {hero.freeMenuCta}
            </Button>
            <Button
              href={`/${locale}#programs`}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {hero.primaryCta}
            </Button>
            <Button
              href={`/${locale}#food`}
              variant="outline"
              size="lg"
              className="w-full font-medium sm:w-auto"
            >
              {hero.secondaryCta}
            </Button>
          </div>

          <dl className="mt-8 hidden gap-6 border-t border-forest-100 pt-8 sm:mt-10 sm:flex sm:flex-wrap sm:gap-8 lg:flex">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-2xl font-semibold text-slate-800">{s.value}</dt>
                <dd className="mt-1 max-w-[8rem] text-xs leading-snug text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="order-2 mx-auto w-full max-w-sm sm:max-w-md lg:order-2 lg:max-w-none">
          <div className="relative">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl shadow-soft ring-1 ring-forest-100/80",
                "aspect-[5/4] max-h-[min(72vw,320px)] sm:aspect-[4/5] sm:max-h-none",
              )}
            >
              <SiteImage
                src={HERO_IMAGE}
                alt={mediaAlt(HERO_IMAGE, locale) || hero.imageAlt}
                fill
                priority
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 85vw, 480px"
              />
            </div>

            <div className="absolute -bottom-3 left-3 right-3 rounded-xl border border-forest-100 bg-white px-3.5 py-3 shadow-lg sm:left-5 sm:right-auto sm:max-w-[13rem] sm:px-4 sm:py-3.5 lg:-left-4">
              <p className="font-display text-3xl font-semibold leading-none text-forest-500 sm:text-4xl">
                94%
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-ink-soft sm:mt-1.5 sm:text-xs">
                {locale === "bg"
                  ? "доказан успех при клиентите"
                  : "proven client success"}
              </p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-ink-soft sm:mt-7 sm:text-sm lg:text-left">
            <span className="font-semibold text-slate-800">
              {locale === "bg" ? "Веси Ней" : "Vessie Nay"}
            </span>
            {" · "}
            {hero.imageAlt}
          </p>
        </div>
      </Container>
    </section>
  );
}
