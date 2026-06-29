import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Flame,
  Heart,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { ProgramLandingContent } from "@/lib/programs/types";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { cn } from "@/lib/utils";

const pillarIcons = [Flame, Heart, Zap];

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

          <div className="mt-10 max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 text-sm font-semibold text-gold-300">
              <Sparkles className="h-4 w-4" /> {hero.eyebrow}
            </span>

            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {hero.title}{" "}
              {hero.titleAccent && (
                <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">
                  {hero.titleAccent}
                </span>
              )}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-green-100/90 sm:text-xl">
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
        </Container>
      </section>

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

      {/* Outcomes */}
      {content.outcomes && (
        <section className="bg-gradient-to-b from-forest-100 to-cream-50 py-24">
          <Container>
            <h2 className="text-center font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.outcomes.title}
            </h2>
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

      {/* Pricing */}
      {content.pricing && (
        <section className="bg-gradient-to-br from-green-50 to-cream-100 py-24">
          <Container className="max-w-4xl text-center">
            <h2 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
              {content.pricing.title}
            </h2>
            <p className="mt-4 text-lg text-forest-700">{content.pricing.subtitle}</p>

            <div
              className={cn(
                "mt-12 grid gap-6",
                content.pricing.options.length > 1 ? "md:grid-cols-2" : "max-w-md mx-auto",
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
                  <p className="mt-3 font-display text-4xl font-bold text-forest-900">{opt.price}</p>
                  <p className="mt-2 text-sm text-forest-600">{opt.note}</p>
                  <CtaLink
                    placementKey={placementKey}
                    href={hero.primaryHref}
                    variant={i === 0 ? "gold" : "forest"}
                    className="mt-6 w-full"
                    target={hero.primaryHref.startsWith("http") ? "_blank" : undefined}
                    rel={hero.primaryHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {opt.cta}
                  </CtaLink>
                </div>
              ))}
            </div>

            {content.pricing.ps && (
              <p className="mt-8 text-sm font-semibold text-gold-700">{content.pricing.ps}</p>
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
