import { BadgeCheck, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

/** Main portrait + two accents — each file used once (no duplicate award thumbs). */
const MAIN = "/images/3.jpg";
const ACCENTS = ["/images/1.jpg", "/images/4.jpg"] as const;

export function About({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { about } = dict;

  return (
    <section id="about" className="section-pad scroll-mt-24 bg-cream-2">
      <Container className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-soft ring-1 ring-white/80">
            <SiteImage
              src={MAIN}
              alt={mediaAlt(MAIN, locale)}
              fill
              sizes="(max-width: 1024px) 85vw, 420px"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {ACCENTS.map((src) => (
              <figure
                key={src}
                className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-sm ring-1 ring-forest-100"
              >
                <SiteImage
                  src={src}
                  alt={mediaAlt(src, locale)}
                  fill
                  sizes="(max-width: 1024px) 45vw, 220px"
                />
              </figure>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{about.eyebrow}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" /> 5.0 Google
            </span>
            <span className="inline-flex items-center rounded-md bg-forest-500/10 px-2.5 py-1 text-xs font-bold text-forest-600">
              94% успех
            </span>
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-slate-800 sm:text-4xl">
            {about.title}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
            {about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <ul className="mt-8 space-y-3">
            {about.credentials.map((c) => (
              <li key={c} className="flex items-start gap-3 text-sm text-slate-800">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                {c}
              </li>
            ))}
          </ul>

          <CtaLink
            placementKey="about_cta"
            href={`/${locale}#contact`}
            variant="forest"
            className="mt-8 rounded-lg px-8"
            size="lg"
          >
            {about.cta}
          </CtaLink>
        </div>
      </Container>
    </section>
  );
}
