import Link from "next/link";
import { ArrowUpRight, Calendar } from "lucide-react";
import type { SiteEvent, SiteSection } from "@/lib/supabase/types";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import { Container } from "@/components/ui/container";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function EventsSection({
  dict,
  locale,
  section,
  events,
}: {
  dict: Dictionary;
  locale: Locale;
  section: SiteSection;
  events: SiteEvent[];
}) {
  if (events.length === 0) return null;

  const title =
    locale === "bg"
      ? section.title_bg || dict.events.title
      : section.title_en || dict.events.title;

  return (
    <section
      id="events"
      className="scroll-mt-24 border-y border-forest-200/50 bg-forest-50 py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow text-forest-600">
            <Calendar className="h-4 w-4" /> {dict.events.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-forest-700/80">{dict.events.subtitle}</p>
        </div>

        <div
          className={cn(
            "mt-14 grid gap-8",
            events.length === 1 && "mx-auto max-w-sm",
            events.length === 2 && "mx-auto max-w-4xl md:grid-cols-2",
            events.length > 2 && "md:grid-cols-2 xl:grid-cols-3",
          )}
        >
          {events.map((event) => {
            const eventTitle = locale === "bg" ? event.title_bg : event.title_en;
            const description =
              locale === "bg" ? event.description_bg : event.description_en;
            const isExternal =
              event.url.startsWith("http") ||
              event.url.startsWith("mailto:") ||
              event.url.startsWith("tel:");

            return (
              <div
                key={event.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-forest-200/80 bg-white shadow-lg ring-1 ring-forest-900/5 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <Link
                  href={event.url}
                  {...(isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex flex-1 flex-col"
                >
                <div className="relative aspect-[16/10] overflow-hidden bg-forest-100">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={eventTitle}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-forest-400 to-forest-600 font-display text-xl text-cream/90">
                      {dict.events.eyebrow}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  {event.event_date && (
                    <p className="text-xs font-medium uppercase tracking-wider text-green-600">
                      {formatDate(event.event_date, locale)}
                    </p>
                  )}
                  <h3 className="mt-2 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-green-600">
                    {eventTitle}
                  </h3>
                  {description && (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm text-ink-soft">
                      {description}
                    </p>
                  )}
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-600">
                    {dict.events.cta} <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                </Link>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
