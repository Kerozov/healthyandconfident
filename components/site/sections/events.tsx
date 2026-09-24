import Link from "next/link";
import { ArrowUpRight, Calendar } from "lucide-react";
import type { SiteEvent, SiteProduct, SiteSection } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { EventOfferSlot } from "@/components/site/cta-offer-slot";
import { CardImage } from "@/components/site/card-image";
import { externalLinkProps } from "@/lib/site/external-link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { visibleInLocale } from "@/lib/site/locale-stripe";

export function EventsSection({
  dict,
  locale,
  section,
  events,
  offersById = {},
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  events: SiteEvent[];
  /** Products available as the "extra offer" configured per event. */
  offersById?: Record<string, SiteProduct>;
}) {
  const items = events.filter((event) =>
    visibleInLocale(event.enabled, event.enabled_en, locale),
  );

  if (items.length === 0) return null;

  const title =
    locale === "bg"
      ? section.title_bg || dict.events.title
      : section.title_en || dict.events.title;

  return (
    <section
      id="events"
      className="section-pad scroll-mt-24 border-y border-forest-100 bg-cream"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-forest-600">
            <Calendar className="h-4 w-4" /> {dict.events.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-ink-soft">{dict.events.subtitle}</p>
        </div>

        <div
          className={cn(
            "mt-14 grid gap-8",
            items.length === 1 && "mx-auto max-w-sm",
            items.length === 2 && "mx-auto max-w-4xl md:grid-cols-2",
            items.length > 2 && "md:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {items.map((event) => {
            const eventTitle = locale === "bg" ? event.title_bg : event.title_en;
            const description =
              locale === "bg" ? event.description_bg : event.description_en;
            const url =
              (locale === "en" ? event.url_en?.trim() : "") || event.url;

            return (
              <div
                key={event.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-forest-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
              >
                <Link
                  href={url}
                  {...externalLinkProps(url)}
                  className="group flex flex-1 flex-col"
                >
                {event.image_url ? (
                  <CardImage
                    src={event.image_url}
                    alt={eventTitle}
                    className="aspect-[16/10]"
                    imageClassName="transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-xl text-white/90">
                    {dict.events.eyebrow}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-6">
                  {event.event_date && (
                    <p className="text-xs font-medium uppercase tracking-wider text-forest-500">
                      {formatDate(event.event_date, locale)}
                    </p>
                  )}
                  <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-slate-800 transition-colors group-hover:text-forest-500">
                    {eventTitle}
                  </h3>
                  {description && (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                      {description}
                    </p>
                  )}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-500">
                    {dict.events.cta} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                </Link>
                <EventOfferSlot
                  event={event}
                  offersById={offersById}
                  locale={locale}
                  className="mx-6 mb-6"
                />
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
