import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Check,
  ChevronDown,
  Droplets,
  Flame,
  Heart,
  Leaf,
  Moon,
  Play,
  Scale,
  Shield,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Zap,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { ProgramLandingContent } from "@/lib/programs/types";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { CtaLink } from "@/components/site/cta-link";
import { LeadForm } from "@/components/site/lead-form";
import { ProgramCountdown } from "@/components/site/program-countdown";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt, mediaIntrinsicSize } from "@/lib/site/media-gallery";
import { cn } from "@/lib/utils";

const pillarIcons = [Flame, Heart, Zap];
const audienceIcons = [Scale, Droplets, Leaf, Shield, Stethoscope, Sun, Moon];

function SectionTitle({
  title,
  accent,
  eyebrow,
  className,
}: {
  title: string;
  accent?: string;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-widest text-forest-500">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
        {title}{" "}
        {accent && <span className="text-forest-500">{accent}</span>}
      </h2>
    </div>
  );
}

function LandingFigure({
  src,
  alt = "",
  figureClassName,
  imageClassName,
  priority,
  sizes,
}: {
  src: string;
  alt?: string;
  figureClassName?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const isRemote = src.startsWith("http");

  if (isRemote) {
    return (
      <figure className={cn("overflow-hidden bg-cream-2", figureClassName)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn("h-auto w-full object-contain", imageClassName)}
          loading={priority ? "eager" : "lazy"}
        />
      </figure>
    );
  }

  const { width, height } = mediaIntrinsicSize(src);
  return (
    <figure className={cn("overflow-hidden bg-cream-2", figureClassName)}>
      <SiteImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={cn("h-auto w-full", imageClassName)}
        imageClassName="object-contain"
        priority={priority}
      />
    </figure>
  );
}

/** Text left / image right on desktop; image first on mobile. */
const splitTextCol = "order-2 lg:order-1";
const splitImageCol = "order-1 lg:order-2";

function FoodGallery({
  gallery,
  locale,
}: {
  gallery: { title: string; titleAccent?: string; images: string[] };
  locale: Locale;
}) {
  return (
    <section className="bg-white py-16">
      <Container>
        <SectionTitle title={gallery.title} accent={gallery.titleAccent} />
        <div className="mt-10 grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {gallery.images.map((src) => {
            const size = mediaIntrinsicSize(src);
            return (
              <figure
                key={src}
                className="overflow-hidden rounded-2xl bg-cream-2 shadow-md ring-1 ring-forest-100/80"
              >
                <SiteImage
                  src={src}
                  alt={mediaAlt(src, locale) || gallery.title}
                  width={size.width}
                  height={size.height}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="h-auto w-full"
                />
              </figure>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export function ProgramLanding({
  content,
  locale,
}: {
  content: ProgramLandingContent;
  locale: Locale;
}) {
  const { hero } = content;
  const placementKey = hero.placementKey ?? `product_${content.slug}`;

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative bg-slate-800 pb-16 pt-4 text-white sm:pb-24 sm:pt-6">
        <div className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-forest-400/10 blur-3xl" />

        <Container className="relative">
          <Link
            href={`/${locale}#programs`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "bg" ? "Обратно към програмите" : "Back to programs"}
          </Link>

          <div
            className={cn(
              "mt-6 grid gap-8 sm:mt-8 sm:gap-10",
              hero.image
                ? "lg:grid-cols-2 lg:items-center lg:gap-12"
                : "max-w-4xl",
            )}
          >
            {hero.image && (
              <LandingFigure
                src={hero.image}
                alt={mediaAlt(hero.image, locale) || hero.title}
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
                figureClassName={cn(
                  "order-1 rounded-2xl border border-white/10 bg-white/5 shadow-2xl sm:rounded-3xl lg:order-2",
                )}
                imageClassName="mx-auto max-h-[min(50vh,360px)] object-contain sm:max-h-[min(65vh,480px)] lg:max-h-none"
              />
            )}

            <div className={cn(hero.image && splitTextCol)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
                <Sparkles className="h-4 w-4" /> {hero.eyebrow}
              </span>

              <h1
                className={cn(
                  "mt-4 font-bold leading-[1.12] tracking-normal text-white sm:mt-6",
                  locale === "bg"
                    ? "font-sans text-[1.75rem] sm:text-5xl lg:text-[3.25rem]"
                    : "font-display text-3xl sm:text-5xl lg:text-6xl",
                )}
              >
                <span className="block">{hero.title}</span>
                {hero.titleAccent && (
                  <span className="mt-1 block text-gold-200 sm:mt-3">{hero.titleAccent}</span>
                )}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-slate-200 sm:mt-6 sm:text-lg lg:text-xl">
                {hero.subtitle}
              </p>

              {hero.bullets && hero.bullets.length > 0 && (
                <ul className="mt-5 space-y-2.5 sm:mt-8 sm:space-y-3">
                  {hero.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-slate-100">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/20">
                        <Check className="h-3.5 w-3.5 text-gold-300" />
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {hero.priceLine && (
                <p className="mt-6 text-balance font-display text-xl font-semibold leading-snug text-white sm:mt-8 sm:text-2xl">
                  {hero.priceLine}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-3">
                <CtaLink
                  placementKey={placementKey}
                  href={hero.primaryHref}
                  variant="onDark"
                  size="lg"
                  className="w-full sm:w-auto"
                  target={hero.primaryHref.startsWith("http") ? "_blank" : undefined}
                  rel={hero.primaryHref.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {hero.primaryCta}
                </CtaLink>
                {hero.secondaryCta && hero.secondaryHref && (
                  <Link
                    href={hero.secondaryHref}
                    className={cn(
                      buttonVariants({ variant: "onDarkOutline", size: "lg" }),
                      "w-full sm:w-auto",
                    )}
                  >
                    {hero.secondaryCta}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {content.galleries?.[0] && (
        <FoodGallery gallery={content.galleries[0]} locale={locale} />
      )}

      {/* Pain */}
      {content.pain && (
        <section className="bg-cream-50 py-20">
          <Container className="max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.pain.title}
            </h2>
            <div className="mt-8 space-y-5 text-left text-lg leading-relaxed text-forest-800">
              {content.pain.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            <p className="mt-10 font-display text-2xl font-bold text-forest-600 sm:text-3xl">
              {content.pain.hook}
            </p>
          </Container>
        </section>
      )}

      {/* Vision */}
      {content.vision && (
        <section className="relative bg-white py-20">
          <Container
            className={cn(
              content.vision.image
                ? "grid max-w-5xl items-start gap-8 sm:gap-12 lg:grid-cols-2 lg:items-center"
                : "max-w-3xl text-center",
            )}
          >
            <div className={cn(content.vision.image && splitTextCol, !content.vision.image && "mx-auto")}>
              <h2 className="font-display text-3xl font-semibold text-forest-600 sm:text-4xl">
                {content.vision.title}
              </h2>
              <div
                className={cn(
                  "mt-8 space-y-5 text-lg leading-relaxed text-forest-800",
                  !content.vision.image && "text-left",
                )}
              >
                {content.vision.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </div>
            {content.vision.image && (
              <LandingFigure
                src={content.vision.image}
                alt={mediaAlt(content.vision.image, locale) || content.vision.title}
                figureClassName={cn("rounded-3xl shadow-xl ring-1 ring-forest-100/80", splitImageCol)}
              />
            )}
          </Container>
        </section>
      )}

      {/* Audience — за кого е */}
      {content.audience && (
        <section className="bg-cream-50 py-24">
          <Container>
            <SectionTitle
              eyebrow={content.audience.eyebrow}
              title={content.audience.title}
            />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {content.audience.items.map((item, i) => {
                const Icon = audienceIcons[i] ?? Heart;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border-2 border-rose-200/80 bg-white p-6 shadow-sm"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold leading-snug text-forest-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-forest-700">{item.text}</p>
                    {item.bullets && item.bullets.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-forest-700">
                        {item.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            {content.audience.closing && (
              <p className="mx-auto mt-12 max-w-3xl text-center text-lg font-medium leading-relaxed text-forest-800">
                {content.audience.closing}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* Представи си */}
      {content.visualize && (
        <section className="bg-white py-20">
          <Container className="grid items-start gap-8 sm:gap-12 lg:grid-cols-2 lg:items-center">
            <div className={splitTextCol}>
              <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
                {content.visualize.title}
              </h2>
              <ul className="mt-8 space-y-3">
                {content.visualize.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-lg text-forest-800">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {content.visualize.image && (
              <LandingFigure
                src={content.visualize.image}
                figureClassName={cn("rounded-3xl shadow-xl", splitImageCol)}
              />
            )}
          </Container>
        </section>
      )}

      {/* Testimonials — early */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="bg-forest-100 py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900">
              {locale === "bg" ? "Истински резултати" : "Real results"}
            </h2>
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {content.testimonials.map((t) => (
                <blockquote
                  key={t.name}
                  className="rounded-3xl border border-forest-100/60 bg-white p-8 shadow-sm"
                >
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />
                    ))}
                  </div>
                  {t.headline && (
                    <p className="mt-4 font-display text-lg font-semibold uppercase leading-snug text-forest-900">
                      „{t.headline}“
                    </p>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-forest-700">
                    {t.quote}
                  </p>
                  <footer className="mt-4 text-sm font-semibold text-forest-600">
                    — {t.name}
                  </footer>
                </blockquote>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Promo strip — 94% */}
      {content.promoStrip && (
        <section className="bg-cream-50 py-20">
          <Container className="grid items-start gap-8 sm:gap-12 lg:grid-cols-2 lg:items-center">
            <div className={splitTextCol}>
              <p className="text-sm font-semibold uppercase tracking-widest text-forest-500">
                {content.promoStrip.subtitle}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
                {content.promoStrip.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-forest-700">
                {content.promoStrip.stat}
              </p>
              <ul className="mt-8 space-y-3">
                {content.promoStrip.checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-forest-800">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-forest-500" />
                    {item}
                  </li>
                ))}
              </ul>
              {content.promoStrip.footer && (
                <p className="mt-6 text-sm font-bold uppercase tracking-wide text-gold-700">
                  {content.promoStrip.footer}
                </p>
              )}
            </div>
            {content.promoStrip.image && (
              <LandingFigure
                src={content.promoStrip.image}
                figureClassName={cn("rounded-3xl shadow-xl", splitImageCol)}
              />
            )}
          </Container>
        </section>
      )}

      {/* Value stack — модули и бонуси */}
      {content.valueStack && (
        <section id="includes" className="scroll-mt-24 bg-white py-24">
          <Container>
            <SectionTitle title={content.valueStack.title} />
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {content.valueStack.modules.map((mod) => (
                <div
                  key={mod.title}
                  className="overflow-hidden rounded-3xl border border-forest-100 bg-cream-50/50 shadow-sm"
                >
                  {mod.image && (
                    <LandingFigure
                      src={mod.image}
                      figureClassName="rounded-none bg-cream-100"
                      imageClassName="max-h-56 object-contain sm:max-h-64"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-lg font-semibold text-forest-900">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-rose-600">{mod.value}</p>
                    <p className="mt-3 text-sm leading-relaxed text-forest-700">{mod.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mt-16 text-center font-display text-2xl font-semibold text-forest-900">
              {content.valueStack.bonusesTitle}
            </h3>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {content.valueStack.bonuses.map((bonus) => (
                <div
                  key={bonus.title}
                  className="overflow-hidden rounded-3xl border border-gold-200/60 bg-gold-50/30 shadow-sm"
                >
                  {bonus.image && (
                    <LandingFigure
                      src={bonus.image}
                      figureClassName="rounded-none bg-gold-50/50"
                      imageClassName="max-h-56 object-contain sm:max-h-64"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="font-display text-lg font-semibold text-forest-900">
                      {bonus.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-rose-600">{bonus.value}</p>
                    <p className="mt-3 text-sm leading-relaxed text-forest-700">{bonus.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-auto mt-12 max-w-xl text-center">
              <p className="font-display text-2xl font-bold text-forest-900">
                {content.valueStack.totalValue}
              </p>
              {content.valueStack.totalNote && (
                <p className="mt-2 text-lg text-forest-600">{content.valueStack.totalNote}</p>
              )}
            </div>
          </Container>
        </section>
      )}

      {/* Education — наука зад метода */}
      {content.education && (
        <section className="bg-cream-50 py-24">
          <Container className="space-y-16">
            {content.education.sections.map((section) => (
              <div
                key={section.title}
                className="grid items-start gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center"
              >
                <div className={splitTextCol}>
                  <h2 className="font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
                    {section.title}
                  </h2>
                  <ul className="mt-6 space-y-4">
                    {section.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-forest-800">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {section.image && (
                  <LandingFigure
                    src={section.image}
                    figureClassName={cn("rounded-3xl shadow-lg", splitImageCol)}
                  />
                )}
              </div>
            ))}
          </Container>
        </section>
      )}

      {/* Comparison — за кого е / не е */}
      {content.comparison && (
        <section className="bg-white py-24">
          <Container>
            <SectionTitle title={content.comparison.title} />
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-forest-100 bg-cream/40 p-8">
                <h3 className="font-display text-lg font-semibold leading-snug text-forest-900">
                  {content.comparison.positive.title}
                </h3>
                <ul className="mt-6 space-y-2">
                  {content.comparison.positive.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-forest-800">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-3xl border border-rose-200 bg-rose-50/30 p-8">
                <h3 className="font-display text-lg font-semibold leading-snug text-forest-900">
                  {content.comparison.negative.title}
                </h3>
                <ul className="mt-6 space-y-2">
                  {content.comparison.negative.bullets.map((b) => (
                    <li key={b} className="text-sm leading-relaxed text-forest-800">
                      {b}
                    </li>
                  ))}
                </ul>
                {content.comparison.negative.closing && (
                  <p className="mt-6 border-t border-rose-200 pt-6 text-sm font-medium leading-relaxed text-slate-800">
                    {content.comparison.negative.closing}
                  </p>
                )}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Transformation — преди/след */}
      {content.transformation && (
        <section className="bg-forest-100 py-24">
          <Container>
            {content.transformation.title && (
              <SectionTitle title={content.transformation.title} className="mb-14" />
            )}
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
              <div className="text-center">
                <p className="font-display text-4xl font-bold tracking-widest text-forest-400">
                  ПРЕДИ
                </p>
                {content.transformation.beforeImage && (
                  <LandingFigure
                    src={content.transformation.beforeImage}
                    figureClassName="mt-4 rounded-2xl shadow-lg"
                  />
                )}
              </div>
              <div className="max-w-md text-center lg:px-4">
                <p className="font-display text-xl font-semibold text-forest-900">
                  {content.transformation.couple}
                </p>
                <div className="mt-6 space-y-4 text-left text-sm leading-relaxed">
                  <div>
                    <p className="font-semibold text-rose-700">Преди:</p>
                    <ul className="mt-2 space-y-1 text-forest-700">
                      {content.transformation.before.map((b) => (
                        <li key={b}>— {b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-forest-600">Сега:</p>
                    <ul className="mt-2 space-y-1 text-forest-700">
                      {content.transformation.after.map((a) => (
                        <li key={a}>— {a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="font-display text-4xl font-bold tracking-widest text-forest-500">
                  СЛЕД
                </p>
                {content.transformation.afterImage && (
                  <LandingFigure
                    src={content.transformation.afterImage}
                    figureClassName="mt-4 rounded-2xl shadow-lg"
                  />
                )}
              </div>
            </div>
            {content.transformation.audienceTitle && content.transformation.audienceBullets && (
              <div className="mx-auto mt-14 max-w-md rounded-2xl border border-forest-100 bg-white p-6">
                <p className="font-display text-lg font-semibold text-forest-900">
                  {content.transformation.audienceTitle}
                </p>
                <ul className="mt-3 space-y-1 text-sm text-forest-700">
                  {content.transformation.audienceBullets.map((b) => (
                    <li key={b}>— {b}</li>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </section>
      )}

      {/* Outcomes */}
      {content.outcomes && (
        <section className="bg-gradient-to-b from-forest-100 to-cream-50 py-24">
          <Container>
            <SectionTitle
              eyebrow={content.outcomes.eyebrow}
              title={content.outcomes.title}
            />
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {content.outcomes.items.map((item, i) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-forest-100/60 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-500 text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-forest-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-700">{item.text}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {content.galleries?.[1] && (
        <FoodGallery gallery={content.galleries[1]} locale={locale} />
      )}

      {/* Curriculum */}
      {content.curriculum && (
        <section className="bg-white py-24">
          <Container>
            {content.curriculum.intro && (
              <p className="mx-auto max-w-3xl text-center text-lg leading-relaxed text-forest-800">
                {content.curriculum.intro}
              </p>
            )}
            <SectionTitle title={content.curriculum.title} className="mt-10" />
            <div className="mx-auto mt-14 grid max-w-4xl gap-4">
              {content.curriculum.items.map((item, i) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-forest-100 bg-cream-50/50 p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-forest-900">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-forest-700">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {content.curriculum.bonuses && content.curriculum.bonuses.length > 0 && (
              <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-gold-300/50 bg-gold-50/50 p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-gold-800">
                  {locale === "bg" ? "Бонус опции за ускорение" : "Bonus acceleration options"}
                </p>
                <ul className="mt-3 space-y-2">
                  {content.curriculum.bonuses.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-forest-800">
                      <Star className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.curriculum.closing && (
              <p className="mx-auto mt-10 max-w-3xl text-center font-display text-lg italic leading-relaxed text-slate-800">
                {content.curriculum.closing}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* Pillars */}
      {content.pillars && (
        <section className="bg-forest-900 py-24 text-white">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">
              {content.pillars.title}
            </h2>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {content.pillars.items.map((item, i) => {
                const Icon = pillarIcons[i] ?? Star;
                return (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm"
                  >
                    <Icon className="h-8 w-8 text-gold-400" />
                    <h3 className="mt-5 font-display text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-200/80">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* Includes — детайлен списък */}
      {content.includes && !content.valueStack && (
        <section id="includes" className="scroll-mt-24 bg-white py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.includes.title}
            </h2>
            <div className="mx-auto mt-14 max-w-3xl divide-y divide-forest-100 rounded-3xl border border-forest-100 bg-cream-50/50">
              {content.includes.items.map((item) => (
                <details key={item.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-forest-900 transition-colors hover:text-forest-600 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-lg">{item.title}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-forest-700">{item.text}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {content.includes && content.valueStack && (
        <section id="club-details" className="scroll-mt-24 bg-white py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.includes.title}
            </h2>
            <div className="mx-auto mt-14 max-w-3xl divide-y divide-forest-100 rounded-3xl border border-forest-100 bg-cream-50/50">
              {content.includes.items.map((item) => (
                <details key={item.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-forest-900 transition-colors hover:text-forest-600 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-lg">{item.title}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-forest-700">{item.text}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Trust / About */}
      {content.trust && (
        <section className="bg-white py-24">
          <Container className="grid items-start gap-10 sm:gap-14 lg:grid-cols-2 lg:items-center">
            <div className={splitTextCol}>
              <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
                {content.trust.title}
              </h2>
              <p className="mt-4 text-xl font-semibold text-forest-600">{content.trust.greeting}</p>
              <ul className="mt-8 space-y-4">
                {content.trust.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-forest-800">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-forest-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 space-y-2 border-t border-forest-100 pt-8">
                {content.trust.accolades.map((a) => (
                  <p key={a} className="flex items-start gap-2 text-sm font-medium text-forest-700">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                    {a}
                  </p>
                ))}
              </div>
            </div>
            <div className={cn("relative mx-auto w-full max-w-lg", splitImageCol)}>
              <div className="rounded-3xl bg-gradient-to-br from-forest-100 to-cream-100 p-2 shadow-xl">
                <LandingFigure
                  src={content.trust.image ?? "/images/vessie-about.jpg"}
                  alt={content.trust.greeting}
                  figureClassName="rounded-2xl bg-white"
                />
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Pricing */}
      {content.pricing && (
        <section className="bg-gradient-to-br from-cream-50 via-white to-cream py-24">
          <Container className="max-w-5xl">
            <div className="text-center">
              <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
                {content.pricing.title}{" "}
                {content.pricing.titleAccent ? (
                  <span className="text-forest-500">{content.pricing.titleAccent}</span>
                ) : null}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-forest-700">
                {content.pricing.subtitle}
              </p>
            </div>

            {(content.pricing.audienceTitle || content.pricing.includesList) && (
              <div className="mt-12 grid gap-8 lg:grid-cols-2">
                {content.pricing.audienceTitle && content.pricing.audienceBullets && (
                  <div className="rounded-2xl border border-forest-100 bg-white p-6">
                    <p className="font-display text-lg font-semibold text-forest-900">
                      {content.pricing.audienceTitle}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-forest-700">
                      {content.pricing.audienceBullets.map((b) => (
                        <li key={b}>— {b}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {content.pricing.includesList && (
                  <div className="rounded-2xl border border-forest-100 bg-white p-6">
                    <p className="font-display text-lg font-semibold text-forest-900">
                      {locale === "bg" ? "Включва:" : "Includes:"}
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-forest-700">
                      {content.pricing.includesList.map((item) => (
                        <li key={item.title} className="flex justify-between gap-4">
                          <span>{item.title}</span>
                          <span className="shrink-0 text-rose-500 line-through">{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {content.pricing.showCountdown && (
              <div className="mt-12 flex justify-center">
                <ProgramCountdown
                  labels={
                    locale === "bg"
                      ? ["Дни", "Часа", "Мин", "Сек"]
                      : ["Days", "Hours", "Min", "Sec"]
                  }
                />
              </div>
            )}

            <div
              className={cn(
                "mt-12 grid gap-6",
                content.pricing.options.length === 1 && "mx-auto max-w-md",
                content.pricing.options.length === 2 &&
                  "mx-auto max-w-3xl md:grid-cols-2",
                content.pricing.options.length > 2 &&
                  "md:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {content.pricing.options.map((opt, i) => {
                const href = opt.href ?? hero.primaryHref;
                return (
                  <div
                    key={opt.label}
                    className={cn(
                      "flex flex-col rounded-3xl border-2 bg-white p-6 shadow-lg",
                      i === 0 && content.pricing!.options.length > 2
                        ? "border-forest-300 md:col-span-2 lg:col-span-3"
                        : i === 0
                          ? "border-gold-400"
                          : "border-forest-100",
                    )}
                  >
                    {opt.badge && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-forest-500">
                        {opt.badge}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-semibold text-forest-600">{opt.label}</p>
                    <p className="mt-2 font-display text-3xl font-bold text-forest-900">
                      {opt.price}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-forest-600">
                      {opt.note}
                    </p>
                    <CtaLink
                      placementKey={placementKey}
                      href={href}
                      variant={i === 0 ? "forest" : "outline"}
                      size="lg"
                      className="mt-4 w-full"
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {opt.cta}
                    </CtaLink>
                  </div>
                );
              })}
            </div>

            {content.pricing.ps && (
              <p className="mt-8 text-center text-sm font-medium text-forest-700">
                {content.pricing.ps}
              </p>
            )}
          </Container>
        </section>
      )}

      {/* FAQ */}
      {content.faq && content.faq.length > 0 && (
        <section className="bg-white py-24">
          <Container className="max-w-3xl">
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900">
              {locale === "bg" ? "Често задавани въпроси" : "FAQ"}
            </h2>
            <div className="mt-12 space-y-4">
              {content.faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-forest-100 bg-cream-50/50"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-forest-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-6 pb-4 text-sm leading-relaxed text-forest-700">{item.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Video + Newsletter */}
      {(content.video || content.newsletter) && (
        <section className="border-t border-forest-100 bg-cream-50 py-24">
          <Container>
            {content.video && (
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
                  {content.video.title}{" "}
                  {content.video.titleAccent && (
                    <span className="text-forest-500">{content.video.titleAccent}</span>
                  )}
                  :
                </h2>
                <CtaLink
                  placementKey={placementKey}
                  href={content.video.href}
                  variant="forest"
                  size="lg"
                  className="mt-8 gap-3 px-10"
                  target={content.video.href.startsWith("http") ? "_blank" : undefined}
                  rel={content.video.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  <Play className="h-5 w-5 fill-current" />
                  {content.video.cta}
                </CtaLink>
              </div>
            )}

            {content.newsletter && (
              <div className="mx-auto mt-16 grid max-w-5xl items-start gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center">
                <LandingFigure
                  src={
                    content.galleries?.[0]?.images[0] ??
                    content.hero.image ??
                    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=750&fit=crop"
                  }
                  figureClassName={cn("rounded-3xl shadow-lg", splitImageCol)}
                />
                <div className={splitTextCol}>
                  <h3 className="font-display text-xl font-semibold leading-snug text-forest-900 sm:text-2xl">
                    {content.newsletter.title}
                  </h3>
                  <div className="mt-6">
                    <LeadForm
                      locale={locale}
                      placeholder={content.newsletter.placeholder}
                      button={content.newsletter.button}
                      consent={content.newsletter.consent}
                      success={content.newsletter.success}
                      error={content.newsletter.error}
                      source={`program-${content.slug}`}
                      segmentTag="newsletter"
                    />
                  </div>
                </div>
              </div>
            )}
          </Container>
        </section>
      )}

      {/* Final CTA */}
      {content.finalCta && (
        <section className="bg-forest-900 py-20 text-center text-white">
          <Container className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              {content.finalCta.title}
            </h2>
            <CtaLink
              placementKey={placementKey}
              href={content.finalCta.href}
              variant="onDark"
              size="lg"
              className="mt-8"
              target={content.finalCta.href.startsWith("http") ? "_blank" : undefined}
              rel={content.finalCta.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {content.finalCta.cta}
            </CtaLink>
          </Container>
        </section>
      )}
    </div>
  );
}
