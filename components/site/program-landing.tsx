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
import { CtaLink } from "@/components/site/cta-link";
import { LeadForm } from "@/components/site/lead-form";
import { ProgramCountdown } from "@/components/site/program-countdown";
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
        <p className="text-sm font-semibold uppercase tracking-widest text-green-600">{eyebrow}</p>
      )}
      <h2 className="mt-2 font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
        {title}{" "}
        {accent && <span className="text-green-600">{accent}</span>}
      </h2>
    </div>
  );
}

function FoodGallery({
  gallery,
}: {
  gallery: { title: string; titleAccent?: string; images: string[] };
}) {
  return (
    <section className="bg-white py-16">
      <Container>
        <SectionTitle title={gallery.title} accent={gallery.titleAccent} />
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {gallery.images.map((src, i) => (
            <div
              key={src}
              className="aspect-square overflow-hidden rounded-2xl bg-green-100 shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          ))}
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
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-forest-900 via-forest-800 to-green-900 pb-24 pt-12 text-white">
        <div className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-green-400/10 blur-3xl" />

        <Container className="relative">
          <Link
            href={`/${locale}#programs`}
            className="inline-flex items-center gap-2 text-sm font-medium text-green-200/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "bg" ? "Обратно към програмите" : "Back to programs"}
          </Link>

          <div
            className={cn(
              "mt-10 gap-12",
              hero.image ? "grid items-center lg:grid-cols-2" : "max-w-4xl",
            )}
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
                <Sparkles className="h-4 w-4" /> {hero.eyebrow}
              </span>

              <h1
                className={cn(
                  "mt-6 font-bold leading-[1.12] tracking-normal text-white",
                  locale === "bg"
                    ? "font-sans text-[2rem] sm:text-5xl lg:text-[3.25rem]"
                    : "font-display text-4xl sm:text-5xl lg:text-6xl",
                )}
              >
                <span className="block">{hero.title}</span>
                {hero.titleAccent && (
                  <span className="mt-2 block text-gold-200 sm:mt-3">{hero.titleAccent}</span>
                )}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-green-100/90 sm:text-xl">
                {hero.subtitle}
              </p>

              {hero.bullets && hero.bullets.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {hero.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-green-50">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/20">
                        <Check className="h-3.5 w-3.5 text-gold-300" />
                      </span>
                      <span className="text-base sm:text-lg">{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-10 flex flex-wrap gap-4">
                <CtaLink
                  placementKey={placementKey}
                  href={hero.primaryHref}
                  variant="gold"
                  size="lg"
                  className="shadow-lg shadow-gold-400/20"
                  target={hero.primaryHref.startsWith("http") ? "_blank" : undefined}
                  rel={hero.primaryHref.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {hero.primaryCta}
                </CtaLink>
                {hero.secondaryCta && hero.secondaryHref && (
                  <Link
                    href={hero.secondaryHref}
                    className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    {hero.secondaryCta}
                  </Link>
                )}
              </div>
            </div>

            {hero.image && (
              <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="aspect-[4/3] w-full object-cover lg:aspect-square"
                />
              </div>
            )}
          </div>
        </Container>
      </section>

      {content.galleries?.[0] && <FoodGallery gallery={content.galleries[0]} />}

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
            <p className="mt-10 font-display text-2xl font-bold text-green-700 sm:text-3xl">
              {content.pain.hook}
            </p>
          </Container>
        </section>
      )}

      {/* Vision */}
      {content.vision && (
        <section className="relative bg-white py-20">
          <Container className="max-w-3xl text-center">
            <h2 className="font-display text-3xl font-semibold text-green-700 sm:text-4xl">
              {content.vision.title}
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-forest-800">
              {content.vision.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
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
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {content.audience.items.map((item, i) => {
                const Icon = audienceIcons[i] ?? Heart;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold leading-snug text-forest-900">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-forest-700">{item.text}</p>
                  </div>
                );
              })}
            </div>
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
                  className="group relative overflow-hidden rounded-3xl border border-green-200/60 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-lg font-bold text-white">
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

      {content.galleries?.[1] && <FoodGallery gallery={content.galleries[1]} />}

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
                  className="flex gap-4 rounded-2xl border border-green-100 bg-cream-50/50 p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
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
              <p className="mx-auto mt-10 max-w-3xl text-center font-display text-lg italic leading-relaxed text-green-800">
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
                    <p className="mt-3 text-sm leading-relaxed text-green-100/80">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* Includes */}
      {content.includes && (
        <section id="includes" className="scroll-mt-24 bg-white py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.includes.title}
            </h2>
            <div className="mx-auto mt-14 max-w-3xl divide-y divide-green-100 rounded-3xl border border-green-100 bg-cream-50/50">
              {content.includes.items.map((item) => (
                <details key={item.title} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-semibold text-forest-900 transition-colors hover:text-green-700 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-lg">{item.title}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-green-600 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-forest-700">{item.text}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Testimonials */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="bg-forest-100 py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900">
              {locale === "bg" ? "Истински резултати" : "Real results"}
            </h2>
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {content.testimonials.map((t) => (
                <blockquote
                  key={t.name}
                  className="rounded-3xl border border-green-200/60 bg-white p-8 shadow-sm"
                >
                  <Star className="h-5 w-5 text-gold-400" />
                  <p className="mt-4 font-display text-lg leading-relaxed text-forest-800">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-4 text-sm font-semibold text-green-700">— {t.name}</footer>
                </blockquote>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Trust / About */}
      {content.trust && (
        <section className="bg-white py-24">
          <Container className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
                {content.trust.title}
              </h2>
              <p className="mt-4 text-xl font-semibold text-green-700">{content.trust.greeting}</p>
              <ul className="mt-8 space-y-4">
                {content.trust.credentials.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-forest-800">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 space-y-2 border-t border-green-100 pt-8">
                {content.trust.accolades.map((a) => (
                  <p key={a} className="flex items-start gap-2 text-sm font-medium text-forest-700">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                    {a}
                  </p>
                ))}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-lg">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-100 to-cream-100 p-2 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.trust.image ?? "/images/vessie-about.jpg"}
                  alt={content.trust.greeting}
                  className="w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Pricing */}
      {content.pricing && (
        <section className="bg-gradient-to-br from-cream-50 via-white to-green-50 py-24">
          <Container className="max-w-4xl text-center">
            <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.pricing.title}{" "}
              {content.pricing.titleAccent ? (
                <span className="text-green-600">{content.pricing.titleAccent}</span>
              ) : null}
              {/готова|ready/i.test(content.pricing.title) ? "?" : ""}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-forest-700">{content.pricing.subtitle}</p>

            <div className="mx-auto mt-10 max-w-xl space-y-4">
              {content.pricing.options.map((opt, i) => {
                const href = opt.href ?? hero.primaryHref;
                return (
                  <CtaLink
                    key={opt.label}
                    placementKey={placementKey}
                    href={href}
                    variant="forest"
                    size="lg"
                    className="w-full whitespace-normal px-6 py-5 text-base leading-snug sm:text-lg"
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    <span className="block font-bold">{opt.cta}</span>
                    <span className="mt-1 block text-sm font-normal text-green-100">
                      {opt.price} · {opt.note}
                    </span>
                  </CtaLink>
                );
              })}
            </div>

            {content.pricing.ps && (
              <p className="mt-6 text-sm font-semibold text-forest-700">{content.pricing.ps}</p>
            )}

            {content.pricing.showCountdown && (
              <div className="mt-12">
                <ProgramCountdown
                  labels={
                    locale === "bg"
                      ? ["Дни", "Часа", "Мин", "Сек"]
                      : ["Days", "Hours", "Min", "Sec"]
                  }
                />
              </div>
            )}

            {content.pricing.options.length > 1 && !content.pricing.showCountdown && (
              <div
                className={cn(
                  "mt-12 grid gap-6",
                  "md:grid-cols-2",
                )}
              >
                {content.pricing.options.map((opt, i) => (
                  <div
                    key={opt.label}
                    className={cn(
                      "rounded-3xl border-2 bg-white p-8 shadow-lg",
                      i === 0 ? "border-gold-400" : "border-green-300",
                    )}
                  >
                    <p className="text-sm font-semibold uppercase tracking-wider text-green-600">
                      {opt.label}
                    </p>
                    <p className="mt-3 font-display text-4xl font-bold text-forest-900">
                      {opt.price}
                    </p>
                    <p className="mt-2 text-sm text-forest-600">{opt.note}</p>
                  </div>
                ))}
              </div>
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
                  className="group rounded-2xl border border-green-100 bg-cream-50/50"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-5 w-5 shrink-0 text-green-600 transition-transform group-open:rotate-180" />
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
        <section className="border-t border-green-100 bg-cream-50 py-24">
          <Container>
            {content.video && (
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
                  {content.video.title}{" "}
                  {content.video.titleAccent && (
                    <span className="text-green-600">{content.video.titleAccent}</span>
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
              <div className="mx-auto mt-16 grid max-w-5xl items-center gap-10 lg:grid-cols-2">
                <div className="overflow-hidden rounded-3xl shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/program-banner.png"
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
                <div>
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
              variant="gold"
              size="lg"
              className="mt-8 shadow-lg"
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
