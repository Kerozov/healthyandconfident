import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import type { SiteEvent, SiteProduct } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { EventOfferSlot } from "@/components/site/cta-offer-slot";
import { CardImage } from "@/components/site/card-image";
import { externalLinkProps } from "@/lib/site/external-link";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import { formatDate } from "@/lib/utils";

/**
 * Upcoming events as a slim announcement bar above the hero: seen first, but
 * never in place of the promise the page opens with.
 */
export function EventsStrip({
  dict,
  locale,
  events,
  offersById = {},
}: {
  dict: Dictionary;
  locale: Locale;
  events: SiteEvent[];
  /** Products available as the "extra offer" configured per event. */
  offersById?: Record<string, SiteProduct>;
}) {
  const items = events.filter((event) =>
    visibleInLocale(event.enabled, event.enabled_en, locale),
  );
  if (items.length === 0) return null;

  return (
    <section
      id="events"
      aria-label={dict.events.eyebrow}
      className="scroll-mt-24 border-b border-forest-100 bg-forest-50"
    >
      <Container className="divide-y divide-forest-100">
        {items.map((event) => {
          const title = locale === "bg" ? event.title_bg : event.title_en;
          const url = (locale === "en" ? event.url_en?.trim() : "") || event.url;

          return (
            <div key={event.id} className="py-3">
              <Link
                href={url}
                {...externalLinkProps(url)}
                className="group flex items-center gap-3 sm:gap-4"
              >
                {event.image_url ? (
                  <CardImage
                    src={event.image_url}
                    alt=""
                    sizes="56px"
                    className="hidden h-12 w-12 shrink-0 rounded-xl sm:block"
                  />
                ) : (
                  <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-forest-500 sm:flex">
                    <Calendar className="h-5 w-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-forest-600">
                    {dict.events.eyebrow}
                    {event.event_date && ` · ${formatDate(event.event_date, locale)}`}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-forest-700">
                    {title}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-slate-700 sm:px-4 sm:text-sm">
                  <span className="hidden sm:inline">{dict.events.cta}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                  <span className="sr-only sm:hidden">{dict.events.cta}</span>
                </span>
              </Link>
              <EventOfferSlot
                event={event}
                offersById={offersById}
                locale={locale}
                compact
                className="mt-3"
              />
            </div>
          );
        })}
      </Container>
    </section>
  );
}
