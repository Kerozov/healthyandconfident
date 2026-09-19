import { Check, Star } from "lucide-react";
import type { Dictionary, Program } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteProgramCard, SiteSection } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { SiteImage } from "@/components/site/site-image";
import { mediaAlt } from "@/lib/site/media-gallery";
import {
  filterProgramCardsForLocale,
  programCardForLocale,
  programCardHref,
} from "@/lib/site/program-cards";
import { cn } from "@/lib/utils";

/** A card image can be a file in /public or an upload in Supabase Storage. */
function CardFigure({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <figure className="relative aspect-[4/3] overflow-hidden bg-cream-2">
      {src.startsWith("http") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-contain sm:object-cover"
        />
      ) : (
        <SiteImage
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 33vw"
          imageClassName="object-contain sm:object-cover"
        />
      )}
    </figure>
  );
}

export function Programs({
  dict,
  locale,
  section,
  cards,
}: {
  dict: Dictionary;
  locale: Locale;
  section?: SiteSection;
  /** Admin-managed cards. Empty (or table not migrated) falls back to the dictionary. */
  cards?: SiteProgramCard[];
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
      <Container className="min-w-0">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-forest-500">
            <Star className="h-4 w-4" /> {locale === "bg" ? "Програми" : "Programs"}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{programs.subtitle}</p>
        </div>

        <div className="mt-14 grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
          {items.map(({ program: p, placementKey }) => {
            const href = programCardHref(p.href, locale);
            return (
              <div
                key={placementKey}
                className={cn(
                  "relative flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border transition-all",
                  p.highlight
                    ? "border-2 border-forest-500 bg-white shadow-lg lg:scale-[1.02]"
                    : "border-forest-100 bg-white hover:border-forest-300 hover:shadow-md",
                )}
              >
                {p.image && (
                  <CardFigure src={p.image} alt={mediaAlt(p.image, locale) || p.title} />
                )}
                <div className="flex flex-1 flex-col p-6">
                  {p.badge && (
                    <span
                      className={cn(
                        "absolute z-10 rounded-full px-3 py-1 text-xs font-semibold",
                        p.image ? "top-4 left-4" : "-top-3 left-8",
                        p.highlight
                          ? "bg-slate-500 text-white"
                          : "bg-forest-100 text-forest-700",
                      )}
                    >
                      {p.badge}
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-semibold text-slate-800">{p.title}</h3>
                  {p.duration && (
                    <span className="mt-2 inline-flex w-fit rounded-full bg-forest-50 px-3 py-1 text-xs text-forest-700">
                      {p.duration}
                    </span>
                  )}
                  {p.price && (
                    <span className="mt-3 inline-flex w-fit rounded-full bg-cream-2 px-3 py-1 text-xs text-slate-700">
                      {p.price}
                    </span>
                  )}
                  <p className="mt-4 text-sm leading-relaxed text-ink-soft">{p.description}</p>
                  <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-800">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <CtaLink
                    placementKey={placementKey}
                    href={href}
                    variant={p.highlight ? "primary" : "outline"}
                    className={cn("mt-8 w-full py-3", p.highlight && "font-semibold")}
                  >
                    {p.cta}
                  </CtaLink>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
