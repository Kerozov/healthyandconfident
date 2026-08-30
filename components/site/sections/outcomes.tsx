import { Check, Sparkles } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const PHOTO = "/images/15-after.jpg";

const COPY = {
  bg: {
    eyebrow: "След няколко месеца",
    badge: "След програмата",
    photoCaption: "Реална клиентка — 3 месеца по-късно",
    statValue: "94%",
    statLabel: "успех при клиентите",
  },
  en: {
    eyebrow: "A few months from now",
    badge: "After the program",
    photoCaption: "A real client — three months later",
    statValue: "94%",
    statLabel: "client success rate",
  },
} as const;

/** Rotating accents so the list reads as a warm collage, not a grey block. */
const TILE_TONES = [
  "border-forest-200 bg-forest-50 text-forest-700",
  "border-gold-400/40 bg-gold-400/10 text-gold-600",
  "border-coral-300/50 bg-coral-400/10 text-coral-600",
  "border-slate-200 bg-slate-50 text-slate-600",
] as const;

export function Outcomes({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { outcomes } = dict;
  const copy = locale === "bg" ? COPY.bg : COPY.en;

  return (
    <section
      id="outcomes"
      className="section-pad relative scroll-mt-24 overflow-x-clip bg-gradient-to-b from-cream via-cream-2 to-cream"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-forest-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl"
      />

      <Container className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <figure className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-forest-100">
            <div className="relative aspect-[3/4]">
              <SiteImage
                src={PHOTO}
                alt={mediaAlt(PHOTO, locale)}
                fill
                sizes="(max-width: 1024px) 90vw, 40vw"
                imageClassName="object-cover object-center"
              />
              <span className="absolute left-4 top-4 rounded-full bg-forest-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                {copy.badge}
              </span>
            </div>
            <figcaption className="flex items-center justify-between gap-4 border-t border-forest-100 px-5 py-4">
              <span className="min-w-0 text-sm leading-snug text-slate-700">
                {copy.photoCaption}
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-2xl font-semibold text-forest-600">
                  {copy.statValue}
                </span>
                <span className="block text-[11px] leading-snug text-ink-soft">
                  {copy.statLabel}
                </span>
              </span>
            </figcaption>
          </div>
        </figure>

        <div className="mt-6 lg:mt-0">
          <span className="eyebrow">
            <Sparkles className="h-4 w-4" aria-hidden /> {copy.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-800 sm:text-4xl">
            {outcomes.title}
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
            {outcomes.subtitle}
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {outcomes.items.map((item, i) => (
              <li
                key={item}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium shadow-card ${
                  TILE_TONES[i % TILE_TONES.length]
                }`}
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="text-slate-800">{item}</span>
              </li>
            ))}
          </ul>

          <CtaLink
            placementKey="outcomes_cta"
            href={`/${locale}#programs`}
            variant="primary"
            size="lg"
            className="mt-8 px-8"
          >
            {dict.contact.cta}
          </CtaLink>
        </div>
      </Container>
    </section>
  );
}
