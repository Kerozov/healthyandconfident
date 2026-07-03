import { Check } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const HERO_IMAGE = "/images/5.jpg";

export function Hero({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { hero } = dict;

  return (
    <section className="section-pad bg-cream">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="animate-fade-up max-w-xl">
          <p className="eyebrow">{hero.eyebrow}</p>

          {locale === "bg" ? (
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.12] tracking-tight text-slate-800 sm:text-5xl lg:text-[3.25rem]">
              Свали трайно{" "}
              <span className="text-forest-500">5–15 кг</span> и се почувствай
              уверена
            </h1>
          ) : (
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.12] tracking-tight text-slate-800 sm:text-5xl lg:text-[3.25rem]">
              {hero.title}{" "}
              <span className="text-forest-500">{hero.titleAccent}</span>
            </h1>
          )}

          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{hero.subtitle}</p>

          <ul className="mt-6 space-y-2.5">
            {hero.bullets.slice(0, 4).map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-800">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href={`/${locale}#programs`} variant="primary" size="lg">
              {hero.primaryCta}
            </Button>
            <Button href={`/${locale}#about`} variant="ghost" size="lg" className="font-medium">
              {locale === "bg" ? "Научи повече за мен →" : "Learn more about me →"}
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-8 border-t border-forest-100 pt-8">
            {hero.stats.map((s) => (
              <div key={s.label}>
                <dt className="font-display text-3xl font-semibold text-slate-800">{s.value}</dt>
                <dd className="mt-1 max-w-[8rem] text-xs leading-snug text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-soft ring-1 ring-forest-100/80">
            <SiteImage
              src={HERO_IMAGE}
              alt={mediaAlt(HERO_IMAGE, locale) || hero.imageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 480px"
            />
          </div>
          <p className="mt-4 text-center text-sm text-ink-soft lg:text-left">
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
