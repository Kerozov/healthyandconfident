import { BadgeCheck, Star } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaByCategory } from "@/lib/site/media-gallery";

const ABOUT_IMAGE = "/images/5.jpg";

export function About({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const { about } = dict;
  const awards = mediaByCategory("award");

  return (
    <section
      id="about"
      className="scroll-mt-24 bg-gradient-to-br from-cream to-cream-2 py-24"
    >
      <Container className="grid items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative mx-auto w-full max-w-sm lg:sticky lg:top-28">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] shadow-soft">
            <SiteImage
              src={ABOUT_IMAGE}
              alt={about.title}
              fill
              sizes="(max-width: 1024px) 85vw, 380px"
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {about.credentials.map((c) => (
              <div
                key={c}
                className="flex items-start gap-2 rounded-xl border border-forest-100 bg-white px-4 py-2 text-sm text-forest-800 shadow-sm"
              >
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                {c}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {awards.map((item) => (
              <figure
                key={item.src}
                className="overflow-hidden rounded-xl border border-forest-100 bg-white shadow-sm"
              >
                <SiteImage
                  src={item.src}
                  alt={item.alt[locale]}
                  width={400}
                  height={260}
                  sizes="200px"
                  className="rounded-xl"
                />
              </figure>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow text-forest-500">{about.eyebrow}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-3 py-1 text-sm font-bold text-forest-800">
              <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" /> 5.0
            </span>
          </div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-800 sm:text-4xl">
            {about.title}
          </h2>
          <div className="mt-6 space-y-5 leading-relaxed text-ink-soft">
            {about.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <CtaLink
            placementKey="about_cta"
            href={`/${locale}#contact`}
            variant="forest"
            className="mt-8 px-8 py-3.5 font-bold"
            size="lg"
          >
            {about.cta}
          </CtaLink>
        </div>
      </Container>
    </section>
  );
}
