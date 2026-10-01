import { ArrowRight, CalendarDays } from "lucide-react";
import type { SiteEvent, SiteProduct, SiteSection } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EventOfferSlot } from "@/components/site/cta-offer-slot";
import { CardImage } from "@/components/site/card-image";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import { formatDate } from "@/lib/utils";

const INTL_LOCALE: Record<Locale, string> = { bg: "bg-BG", en: "en-GB" };

/** Today in Bulgaria, as the `YYYY-MM-DD` an event date is stored in. */
function todayInSofia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
}

/** „15“ and „окт.“ for the calendar tile on the poster. */
function dateTile(date: string, locale: Locale) {
  const d = new Date(`${date}T12:00:00`);
  const intl = INTL_LOCALE[locale];
  return {
    day: new Intl.DateTimeFormat(intl, { day: "numeric" }).format(d),
    month: new Intl.DateTimeFormat(intl, { month: "short" }).format(d).replace(/\.$/, ""),
  };
}

/**
 * What is coming up — a webinar, a live, a questionnaire — as one calm card
 * per item, just before the programmes: a free first step for whoever is not
 * ready to buy yet. A dated event drops off the page once its day has passed,
 * so the site never invites anyone to something that is over.
 */
export function UpcomingEvents({
  dict,
  locale,
  section,
  events,
  offersById = {},
}: {
  dict: Dictionary;
  locale: Locale;
  section?: SiteSection;
  events: SiteEvent[];
  /** Products available as the "extra offer" configured per event. */
  offersById?: Record<string, SiteProduct>;
}) {
  const today = todayInSofia();
  const items = events.filter(
    (event) =>
      visibleInLocale(event.enabled, event.enabled_en, locale) &&
      (!event.event_date || event.event_date.slice(0, 10) >= today),
  );
  if (items.length === 0) return null;

  const eyebrow =
    (locale === "bg" ? section?.title_bg : section?.title_en)?.trim() || dict.events.eyebrow;

  return (
    <section
      id="events"
      aria-label={eyebrow}
      className="scroll-mt-24 bg-cream pt-12 sm:pt-16 lg:pt-20"
    >
      <Container>
        <div className="mx-auto grid max-w-5xl gap-5">
          {items.map((event) => {
            const title = (locale === "en" ? event.title_en.trim() : "") || event.title_bg;
            const description =
              (locale === "en" ? event.description_en.trim() : "") || event.description_bg.trim();
            const url = (locale === "en" ? event.url_en?.trim() : "") || event.url;
            const date = event.event_date?.slice(0, 10);
            const tile = date ? dateTile(date, locale) : null;

            return (
              <article
                key={event.id}
                className="grid overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-forest-100 md:grid-cols-[18rem_minmax(0,1fr)] lg:grid-cols-[21rem_minmax(0,1fr)]"
              >
                <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[18rem] lg:min-h-[21rem]">
                  {event.image_url ? (
                    <CardImage
                      src={event.image_url}
                      alt={title}
                      sizes="(max-width: 768px) 100vw, 336px"
                      className="absolute inset-0"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center bg-forest-50 text-forest-400"
                    >
                      <CalendarDays className="h-12 w-12" />
                    </span>
                  )}
                  {tile && (
                    <span className="absolute left-4 top-4 flex min-w-14 flex-col items-center rounded-2xl bg-white/95 px-3 py-2 shadow-sm">
                      <span className="font-display text-2xl font-semibold leading-none tabular-nums text-slate-800">
                        {tile.day}
                      </span>
                      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-forest-600">
                        {tile.month}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                  <p className="eyebrow">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {eyebrow}
                  </p>
                  <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-slate-800 sm:text-3xl text-balance">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-3 leading-relaxed text-ink-soft">{description}</p>
                  )}
                  {date && (
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      {formatDate(date, locale)}
                    </p>
                  )}
                  <div className="mt-6">
                    <Button href={url} size="lg" className="rounded-full">
                      {dict.events.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <EventOfferSlot
                    event={event}
                    offersById={offersById}
                    locale={locale}
                    compact
                    className="mt-6"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
