import { ExternalLink, Heart } from "lucide-react";
import type { Dictionary } from "@/i18n/types";
import type { Locale } from "@/i18n/config";
import type { SiteSection, SiteVideo } from "@/lib/supabase/types";
import { Container } from "@/components/ui/container";
import { CtaLink } from "@/components/site/cta-link";
import { GoogleIcon } from "@/components/site/google-icon";
import { LiteYouTube } from "@/components/site/lite-youtube";
import { SiteImage } from "@/components/site/site-image";
import { StarRow } from "@/components/site/star-row";
import { mediaAlt } from "@/lib/site/media-gallery";
import { visibleInLocale } from "@/lib/site/locale-stripe";
import {
  CLIENT_TRANSFORMATION_PAIRS,
  TRANSFORMATION_COLLAGE,
} from "@/lib/site/transformation-images";
import { siteConfig } from "@/lib/site";
import { parseYoutubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";

/**
 * Every piece of proof in one place, strongest first: photos, then clients
 * telling it in their own words, then what they wrote on Google.
 */
export function Results({
  dict,
  locale,
  videosSection,
  videos,
}: {
  dict: Dictionary;
  locale: Locale;
  videosSection?: SiteSection;
  videos: SiteVideo[];
}) {
  const { results, googleReviews } = dict;

  const clips = videos
    .filter((video) => visibleInLocale(video.enabled, video.enabled_en, locale))
    .map((video) => ({ video, id: parseYoutubeVideoId(video.youtube_url) }))
    .filter((row): row is { video: SiteVideo; id: string } => Boolean(row.id));

  const videosTitle =
    (locale === "bg" ? videosSection?.title_bg : videosSection?.title_en)?.trim() ||
    results.videosTitle;

  return (
    <section id="results" className="section-pad scroll-mt-24 bg-cream-2">
      {/* Sections this one replaced — old links and emails still point at them. */}
      <div id="testimonials" className="sr-only" />
      <div id="outcomes" className="sr-only" />
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">
            <Heart className="h-4 w-4" aria-hidden /> {results.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-slate-800 sm:text-4xl text-balance">
            {results.title}
          </h2>
          <p className="mt-4 text-ink-soft">{results.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <figure className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-forest-100">
            <div className="relative aspect-[3/2]">
              <SiteImage
                src={TRANSFORMATION_COLLAGE}
                alt={mediaAlt(TRANSFORMATION_COLLAGE, locale)}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                imageClassName="object-cover object-[center_18%]"
              />
              <PhaseLabel className="left-3" before label={results.beforeLabel} />
              <PhaseLabel className="left-[calc(50%+0.75rem)]" label={results.afterLabel} />
            </div>
            <figcaption className="px-5 py-3.5 text-sm text-slate-700">
              {results.collageCaption}
            </figcaption>
          </figure>

          {CLIENT_TRANSFORMATION_PAIRS.map((pair, i) => (
            <figure
              key={pair.after}
              className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-forest-100"
            >
              <div className="grid grid-cols-2 gap-0.5 bg-forest-100">
                {[pair.before, pair.after].map((src, side) => (
                  <div key={src} className="relative aspect-[3/4]">
                    <SiteImage
                      src={src}
                      alt={mediaAlt(src, locale)}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      imageClassName="object-cover object-center"
                    />
                    <PhaseLabel
                      className="left-3"
                      before={side === 0}
                      label={side === 0 ? results.beforeLabel : results.afterLabel}
                    />
                  </div>
                ))}
              </div>
              {results.pairCaptions[i] && (
                <figcaption className="px-5 py-3.5 text-sm text-slate-700">
                  {results.pairCaptions[i]}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {clips.length > 0 && (
          <div id="videos" className="mt-16 scroll-mt-24">
            <h3 className="text-center font-display text-2xl font-semibold text-slate-800 sm:text-3xl">
              {videosTitle}
            </h3>
            <div
              className={cn(
                "mt-8 grid gap-5",
                clips.length === 1 && "mx-auto max-w-3xl",
                clips.length === 2 && "mx-auto max-w-5xl md:grid-cols-2",
                clips.length > 2 && "md:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {clips.map(({ video, id }) => {
                const title =
                  (locale === "bg"
                    ? video.title_bg || video.title_en
                    : video.title_en || video.title_bg) || "YouTube";
                return (
                  <article
                    key={video.id}
                    className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-forest-100"
                  >
                    <div className="relative aspect-video bg-slate-900">
                      <LiteYouTube videoId={id} title={title} playLabel={results.playLabel} />
                    </div>
                    <p className="px-5 py-3.5 text-sm font-medium leading-snug text-slate-800">
                      {title}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div id="google-reviews" className="mt-16 scroll-mt-24">
          <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-white px-6 py-5 shadow-card ring-1 ring-forest-100 sm:flex-row">
            <div className="flex items-center gap-4">
              <GoogleIcon className="h-10 w-10 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{googleReviews.title}</h3>
                <p className="mt-0.5 flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-800">
                    {googleReviews.aggregateRating}
                  </span>
                  <StarRow rating={5} />
                  <span className="text-sm text-ink-soft">
                    {googleReviews.reviewCount} {googleReviews.reviewCountLabel}
                  </span>
                </p>
              </div>
            </div>
            <a
              href={siteConfig.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-600 underline-offset-4 hover:underline"
            >
              {googleReviews.ctaLabel}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {googleReviews.items.map((review) => (
              <figure
                key={`${review.name}-${review.date}`}
                className="flex flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-forest-100"
              >
                <StarRow rating={review.rating} />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  &ldquo;{review.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 border-t border-forest-100 pt-3">
                  <p className="text-sm font-semibold text-slate-800">{review.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {review.date} · {googleReviews.postedOnLabel}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <CtaLink
            placementKey="outcomes_cta"
            href={`/${locale}#programs`}
            variant="primary"
            size="lg"
            className="h-14 w-full rounded-full px-10 text-base sm:w-auto"
          >
            {results.cta}
          </CtaLink>
        </div>
      </Container>
    </section>
  );
}

function PhaseLabel({
  label,
  before = false,
  className,
}: {
  label: string;
  before?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs",
        before
          ? "bg-white/95 text-slate-700 ring-1 ring-slate-200"
          : "bg-forest-600 text-white shadow-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
