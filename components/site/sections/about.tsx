import { Award, BadgeCheck } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";

const PORTRAIT = "/images/5.jpg";
/** On stage, receiving the national award. */
const AWARD_PHOTO = "/images/1.jpg";

export function About({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { about } = dict;

  return (
    <section id="about" className="section-pad scroll-mt-24 bg-cream-2">
      <Container className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
        <div className="relative mx-auto w-full max-w-sm pb-10 pr-10 sm:max-w-md lg:max-w-none">
          <figure className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-white/80">
            <SiteImage
              src={PORTRAIT}
              alt={mediaAlt(PORTRAIT, locale)}
              fill
              sizes="(max-width: 1024px) 85vw, 440px"
              imageClassName="object-cover object-[center_15%]"
            />
          </figure>
          <figure className="absolute bottom-0 right-0 w-[42%] overflow-hidden rounded-2xl bg-white shadow-xl ring-4 ring-cream-2">
            <div className="relative aspect-[3/4]">
              <SiteImage
                src={AWARD_PHOTO}
                alt={mediaAlt(AWARD_PHOTO, locale)}
                fill
                sizes="200px"
                imageClassName="object-cover object-[center_60%]"
              />
            </div>
          </figure>
        </div>

        <div>
          <p className="eyebrow">{about.eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-slate-800 sm:text-4xl text-balance">
            {about.title}
          </h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-ink-soft">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {about.credentials.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-slate-800">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-card ring-1 ring-gold-400/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400/25 text-gold-600">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            {about.award}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaLink
              placementKey="about_cta"
              href={`/${locale}#programs`}
              variant="primary"
              size="lg"
              className="w-full rounded-full sm:w-auto"
            >
              {about.cta}
            </CtaLink>
            <CtaLink
              placementKey="bio_banner_cta"
              href={about.communityHref.replace("{locale}", locale)}
              variant="outline"
              size="lg"
              className="w-full rounded-full sm:w-auto"
            >
              {about.communityCta}
            </CtaLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
