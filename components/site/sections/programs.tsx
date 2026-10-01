import { Check, Lock, MessageCircle, Star } from "lucide-react";
import type { Dictionary, Program } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteProgramCard, SiteSection } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { CardImage } from "@/components/site/card-image";
import { PriceTag } from "@/components/site/price-tag";
import { SectionLink } from "@/components/site/section-link";
import { mediaAlt } from "@/lib/site/media-gallery";
import {
  filterProgramCardsForLocale,
  programCardForLocale,
  programCardHref,
} from "@/lib/site/program-cards";
import { cn } from "@/lib/utils";

export function Programs({
  dict,
  locale,
  section,
  cards,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  section?: SiteSection;
  /** Admin-managed cards. Empty (or table not migrated) falls back to the dictionary. */
  cards?: SiteProgramCard[];
  /** Extra offers shown under the cards, inside the same section (home page). */
  children?: React.ReactNode;
}) {
  const { programs } = dict;
  if (section && !section.enabled) return null;

  // Each card keeps its own placement key so a card that is hidden, reordered
  // or added never moves another card's button (and its Stripe wiring) to a
  // different programme.
  const visible = filterProgramCardsForLocale(cards ?? [], locale);
  const items: { program: Program; placementKey: string }[] =
    visible.length > 0
      ? visible.map((card) => ({
          program: programCardForLocale(card, locale),
          placementKey: card.placement_key,
        }))
      : programs.items.map((program, index) => ({
          program,
          placementKey: `programs_${index}`,
        }));

  if (items.length === 0) return null;

  const title =
    (locale === "bg" ? section?.title_bg : section?.title_en)?.trim() ||
    programs.title;

  return (
    <section id="programs" className="overflow-x-clip section-pad scroll-mt-24 bg-cream">
      {/* The 21-day challenge had its own block; old links and emails still aim at it. */}
      <div id="challenge-21" className="sr-only" />
      <Container className="min-w-0">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <Star className="h-4 w-4" aria-hidden /> {programs.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl text-balance">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{programs.subtitle}</p>
        </div>

        <div
          className={cn(
            "mx-auto mt-12 grid w-full min-w-0 grid-cols-1 gap-6 lg:items-stretch",
            items.length === 1 && "max-w-md",
            items.length === 2 && "max-w-4xl md:grid-cols-2",
            items.length >= 3 && "md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {items.map(({ program: p, placementKey }) => (
            <ProgramCard
              key={placementKey}
              program={p}
              placementKey={placementKey}
              href={programCardHref(p.href, locale)}
              locale={locale}
              wasLabel={programs.wasLabel}
            />
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-ink-soft sm:text-sm">
          <Lock className="h-3.5 w-3.5 shrink-0 text-forest-500" aria-hidden />
          {programs.trustLine}
        </p>

        {children}

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center justify-center gap-2 rounded-2xl border border-forest-100 bg-white px-5 py-4 text-center text-sm sm:flex-row sm:gap-3">
          <span className="text-slate-800">{programs.helpText}</span>
          <SectionLink
            href="#contact"
            locale={locale}
            className="inline-flex items-center gap-1.5 font-semibold text-forest-600 underline-offset-4 hover:underline"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {programs.helpCta}
          </SectionLink>
        </div>
      </Container>
    </section>
  );
}

function ProgramCard({
  program: p,
  placementKey,
  href,
  locale,
  wasLabel,
}: {
  program: Program;
  placementKey: string;
  href: string;
  locale: Locale;
  wasLabel: string;
}) {
  return (
    <article
      className={cn(
        "relative flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl bg-white transition-shadow",
        p.highlight
          ? "shadow-soft ring-2 ring-forest-500 lg:-my-3"
          : "shadow-card ring-1 ring-forest-100 hover:shadow-soft",
      )}
    >
      {p.highlight && p.badge && (
        <p className="flex items-center justify-center gap-1.5 bg-forest-500 py-2 text-xs font-bold uppercase tracking-wider text-white">
          <Star className="h-3.5 w-3.5 fill-white" aria-hidden />
          {p.badge}
        </p>
      )}

      {p.image && (
        <div className="relative">
          <CardImage
            src={p.image}
            alt={mediaAlt(p.image, locale) || p.title}
            className="aspect-[16/10]"
          />
          {!p.highlight && p.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-forest-700 shadow-sm">
              {p.badge}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {!p.image && !p.highlight && p.badge && (
          <span className="mb-3 w-fit rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-700">
            {p.badge}
          </span>
        )}
        {p.duration && (
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-600">
            {p.duration}
          </p>
        )}
        <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-slate-800">
          {p.title}
        </h3>
        {p.description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.description}</p>
        )}
        {p.features.length > 0 && (
          <ul className="mt-5 space-y-2.5 text-sm text-slate-800">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" strokeWidth={2.5} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-6">
          <div className="border-t border-forest-100 pt-5">
            <PriceTag label={p.price} wasLabel={wasLabel} />
            <CtaLink
              placementKey={placementKey}
              href={href}
              variant={p.highlight ? "primary" : "outline"}
              size="lg"
              className={cn("mt-4 w-full rounded-full", !p.highlight && "border-slate-300")}
            >
              {p.cta}
            </CtaLink>
          </div>
        </div>
      </div>
    </article>
  );
}
